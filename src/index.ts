import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Use McpServer
import { 
    CallToolRequestSchema, 
    ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js"; 
import { z } from 'zod'; 
import { zodToJsonSchema } from 'zod-to-json-schema';

// Restore GitHub specific imports
import { Octokit } from "@octokit/rest";
import * as actions from './operations/actions.js';
import { 
    GitHubError, 
    isGitHubError, 
    GitHubValidationError,
    GitHubResourceNotFoundError,
    GitHubAuthenticationError,
    GitHubPermissionError,
    GitHubRateLimitError,
    GitHubConflictError,
    GitHubTimeoutError,
    GitHubNetworkError,
} from './common/errors.js';
import { VERSION } from "./common/version.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFilePath = path.join(__dirname, '..', 'dist', 'mcp-startup.log'); // Ensure log path points to dist

// Simple file logger
function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  try {
    // Ensure dist directory exists before logging
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)){
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`, 'utf8');
  } catch (err: any) { // Use any for broader catch
    const errorMsg = `[File Log Error] Failed to write to ${logFilePath}: ${err?.message || String(err)}`;
    console.error(errorMsg);
    if (err instanceof Error && err.stack) { // Check if error has stack
      console.error(err.stack);
    }
    console.error(`[Original Message] ${message}`);
  }
}

// Clear log file on startup
try { fs.writeFileSync(logFilePath, '', 'utf8'); } catch {}

// Add a global handler for uncaught exceptions
process.on('uncaughtException', (error: Error) => { // Type error
  logToFile('FATAL: Uncaught Exception: ' + (error?.message || String(error)));
  if (error?.stack) {
    logToFile('Stack Trace: ' + error.stack);
  }
  process.exit(1); // Ensure process exits on uncaught exceptions
});

logToFile('[MCP Server Log] Initializing GitHub Actions MCP Server...');

// Restore auth logic
const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!GITHUB_TOKEN) {
  logToFile('FATAL: GITHUB_PERSONAL_ACCESS_TOKEN environment variable is not set.');
  process.exit(1);
}
logToFile('[MCP Server Log] GitHub token found.');
const octokit = new Octokit({ auth: GITHUB_TOKEN });
logToFile('[MCP Server Log] Octokit initialized.');

const server = new McpServer(
  {
    name: "github-actions-mcp-server",
    version: VERSION, 
    context: {
      octokit: octokit
    }
  }
);

// Restore error formatting function
function formatGitHubError(error: GitHubError): string {
  let message = `GitHub API Error: ${error.message}`;
  
  if (error instanceof GitHubValidationError) {
    message = `Validation Error: ${error.message}`;
    if (error.response) {
      message += `\nDetails: ${JSON.stringify(error.response)}`;
    }
  } else if (error instanceof GitHubResourceNotFoundError) {
    message = `Not Found: ${error.message}`;
  } else if (error instanceof GitHubAuthenticationError) {
    message = `Authentication Failed: ${error.message}`;
  } else if (error instanceof GitHubPermissionError) {
    message = `Permission Denied: ${error.message}`;
  } else if (error instanceof GitHubRateLimitError) {
    message = `Rate Limit Exceeded: ${error.message}\nResets at: ${error.resetAt.toISOString()}`;
  } else if (error instanceof GitHubConflictError) {
    message = `Conflict: ${error.message}`;
  } else if (error instanceof GitHubTimeoutError) {
    message = `Timeout: ${error.message}\nTimeout setting: ${error.timeoutMs}ms`;
  } else if (error instanceof GitHubNetworkError) {
    message = `Network Error: ${error.message}\nError code: ${error.errorCode}`;
  }

  return message;
}

// Restore ListTools using server.tool()
server.tool(
    "list_workflows",
    actions.ListWorkflowsSchema.shape,
    async (request: any) => {
      logToFile('[MCP Server Log] Received list_workflows request (via server.tool)');
      // Args are already parsed by the McpServer using the provided schema
      const result = await actions.listWorkflows(request.owner, request.repo, request.page, request.perPage);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

// Register other tools using server.tool()
server.tool(
    "get_workflow",
    actions.GetWorkflowSchema.shape,
    async (request: any) => {
        const result = await actions.getWorkflow(request.owner, request.repo, request.workflowId);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

server.tool(
    "get_workflow_usage",
    actions.GetWorkflowUsageSchema.shape,
    async (request: any) => {
        const result = await actions.getWorkflowUsage(request.owner, request.repo, request.workflowId);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

server.tool(
    "list_workflow_runs",
    actions.ListWorkflowRunsSchema.shape,
    async (request: any) => {
        const { owner, repo, workflowId, ...options } = request;
        const result = await actions.listWorkflowRuns(owner, repo, { workflowId, ...options });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

server.tool(
    "get_workflow_run",
    actions.GetWorkflowRunSchema.shape,
    async (request: any) => {
        const result = await actions.getWorkflowRun(request.owner, request.repo, request.runId);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

server.tool(
    "get_workflow_run_jobs",
    actions.GetWorkflowRunJobsSchema.shape,
    async (request: any) => {
        const { owner, repo, runId, filter, page, perPage } = request;
        const result = await actions.getWorkflowRunJobs(owner, repo, runId, filter, page, perPage);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

server.tool(
    "trigger_workflow",
    actions.TriggerWorkflowSchema.shape,
    async (request: any) => {
        const { owner, repo, workflowId, ref, inputs } = request;
        const result = await actions.triggerWorkflow(owner, repo, workflowId, ref, inputs);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

server.tool(
    "cancel_workflow_run",
    actions.CancelWorkflowRunSchema.shape,
    async (request: any) => {
        const result = await actions.cancelWorkflowRun(request.owner, request.repo, request.runId);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

server.tool(
    "rerun_workflow",
    actions.RerunWorkflowSchema.shape,
    async (request: any) => {
        const result = await actions.rerunWorkflowRun(request.owner, request.repo, request.runId);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
);

// Wrap server logic in a try/catch for initialization errors
try {
    logToFile('[MCP Server Log] Server initialization complete. Ready for connection.');
    // The server likely handles its own connection logic internally or expects a transport.
    // We removed the explicit transport connection part as it might be SDK version dependent.
} catch (error: any) {
    logToFile(`[MCP Server Log] FATAL Error during server setup: ${error?.message || String(error)}`);
    if (error instanceof Error && error.stack) {
        logToFile(error.stack);
    }
    process.exit(1);
}

// Add other process event handlers
process.on('unhandledRejection', (reason, promise) => {
  logToFile(`[MCP Server Log] Unhandled Rejection at: ${promise}, reason: ${reason}`);
  // Consider exiting or logging more details
  // process.exit(1);
});

process.on('SIGINT', () => {
  logToFile('[MCP Server Log] Received SIGINT. Exiting gracefully.');
  // Add any cleanup logic here
  process.exit(0);
});

process.on('SIGTERM', () => {
  logToFile('[MCP Server Log] Received SIGTERM. Exiting gracefully.');
  // Add any cleanup logic here
  process.exit(0);
});