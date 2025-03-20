import { getUserAgent } from "universal-user-agent";
import { createGitHubError, GitHubTimeoutError, GitHubNetworkError, GitHubError, createEnhancedGitHubError } from "./errors.js";
import { VERSION } from "./version.js";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    try {
      return await response.json();
    } catch (error) {
      console.error("Error parsing JSON response:", error);
      throw new Error(`Error parsing JSON response: ${error}`);
    }
  }
  return response.text();
}

export function buildUrl(baseUrl: string, params: Record<string, string | number | undefined>): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value.toString());
    }
  });
  return url.toString();
}

const USER_AGENT = `github-actions-mcp/v${VERSION} ${getUserAgent()}`;

// Default timeout for GitHub API requests (30 seconds)
const DEFAULT_TIMEOUT = 30000;

// Rate limiting constants
const MAX_REQUESTS_PER_MINUTE = 60; // GitHub API rate limit is typically 5000/hour for authenticated requests
let requestCount = 0;
let requestCountResetTime = Date.now() + 60000;

/**
 * Make a request to the GitHub API with security enhancements
 * 
 * @param url The URL to send the request to
 * @param options Request options including method, body, headers, and timeout
 * @returns The response body
 */
export async function githubRequest(
  url: string,
  options: RequestOptions & { timeout?: number } = {}
): Promise<unknown> {
  // Implement basic rate limiting
  if (Date.now() > requestCountResetTime) {
    requestCount = 0;
    requestCountResetTime = Date.now() + 60000;
  }
  
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    const waitTime = requestCountResetTime - Date.now();
    throw new Error(`Rate limit exceeded. Please try again in ${Math.ceil(waitTime / 1000)} seconds.`);
  }
  requestCount++;

  // Validate URL to ensure it's a GitHub API URL (security measure)
  if (!url.startsWith('https://api.github.com/')) {
    throw new Error('Invalid GitHub API URL. Only https://api.github.com/ URLs are allowed.');
  }

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    ...options.headers,
  };

  if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`;
  }

  // Set up request timeout
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw createGitHubError(response.status, responseBody);
    }

    return responseBody;
  } catch (error: unknown) {
    if ((error as Error).name === 'AbortError') {
      throw new GitHubTimeoutError(`Request timeout after ${timeout}ms`, timeout);
    }
    if ((error as { cause?: { code: string } }).cause?.code === 'ENOTFOUND' || 
        (error as { cause?: { code: string } }).cause?.code === 'ECONNREFUSED') {
      throw new GitHubNetworkError(`Unable to connect to GitHub API`, 
        (error as { cause?: { code: string } }).cause!.code);
    }
    if (!(error instanceof GitHubError)) {
      throw createEnhancedGitHubError(error as Error & { cause?: { code: string } });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function validateRepositoryName(name: string): string {
  const sanitized = name.trim().toLowerCase();
  if (!sanitized) {
    throw new Error("Repository name cannot be empty");
  }
  if (!/^[a-z0-9_.-]+$/.test(sanitized)) {
    throw new Error(
      "Repository name can only contain lowercase letters, numbers, hyphens, periods, and underscores"
    );
  }
  if (sanitized.startsWith(".") || sanitized.endsWith(".")) {
    throw new Error("Repository name cannot start or end with a period");
  }
  return sanitized;
}

export function validateOwnerName(owner: string): string {
  const sanitized = owner.trim().toLowerCase();
  if (!sanitized) {
    throw new Error("Owner name cannot be empty");
  }
  if (!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/.test(sanitized)) {
    throw new Error(
      "Owner name must start with a letter or number and can contain up to 39 characters"
    );
  }
  return sanitized;
}