export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response: unknown
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export class GitHubValidationError extends GitHubError {
  constructor(message: string, status: number, response: unknown) {
    super(message, status, response);
    this.name = "GitHubValidationError";
  }
}

export class GitHubResourceNotFoundError extends GitHubError {
  constructor(resource: string) {
    super(`Resource not found: ${resource}`, 404, { message: `${resource} not found` });
    this.name = "GitHubResourceNotFoundError";
  }
}

export class GitHubAuthenticationError extends GitHubError {
  constructor(message = "Authentication failed") {
    super(message, 401, { message });
    this.name = "GitHubAuthenticationError";
  }
}

export class GitHubPermissionError extends GitHubError {
  constructor(message = "Insufficient permissions") {
    super(message, 403, { message });
    this.name = "GitHubPermissionError";
  }
}

export class GitHubRateLimitError extends GitHubError {
  constructor(
    message = "Rate limit exceeded",
    public readonly resetAt: Date
  ) {
    super(message, 429, { message, reset_at: resetAt.toISOString() });
    this.name = "GitHubRateLimitError";
  }
}

export class GitHubTimeoutError extends GitHubError {
  constructor(
    message = "Request timed out",
    public readonly timeoutMs: number
  ) {
    super(message, 408, { message, timeout_ms: timeoutMs });
    this.name = "GitHubTimeoutError";
  }
}

export class GitHubNetworkError extends GitHubError {
  constructor(
    message = "Network error",
    public readonly errorCode: string
  ) {
    super(message, 500, { message, error_code: errorCode });
    this.name = "GitHubNetworkError";
  }
}

export class GitHubConflictError extends GitHubError {
  constructor(message: string) {
    super(message, 409, { message });
    this.name = "GitHubConflictError";
  }
}

export function isGitHubError(error: unknown): error is GitHubError {
  return error instanceof GitHubError;
}

// Add enhanced error factory function
export function createEnhancedGitHubError(error: Error & { cause?: { code: string } }): GitHubError {
  // Handle timeout errors
  if (error.name === 'AbortError') {
    return new GitHubTimeoutError(`Request timed out: ${error.message}`, 30000);
  }
  
  // Handle network errors
  if (error.cause?.code) {
    return new GitHubNetworkError(
      `Network error: ${error.message}`, 
      error.cause.code
    );
  }
  
  // Handle other errors
  return new GitHubError(error.message, 500, { message: error.message });
}

export function createGitHubError(status: number, response: any): GitHubError {
  switch (status) {
    case 401:
      return new GitHubAuthenticationError(response?.message);
    case 403:
      return new GitHubPermissionError(response?.message);
    case 404:
      return new GitHubResourceNotFoundError(response?.message || "Resource");
    case 409:
      return new GitHubConflictError(response?.message || "Conflict occurred");
    case 422:
      return new GitHubValidationError(
        response?.message || "Validation failed",
        status,
        response
      );
    case 429:
      return new GitHubRateLimitError(
        response?.message,
        new Date(response?.reset_at || Date.now() + 60000)
      );
    default:
      return new GitHubError(
        response?.message || "GitHub API error",
        status,
        response
      );
  }
}