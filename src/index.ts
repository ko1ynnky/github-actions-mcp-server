console.log('[MCP Server Test] Node.js process started via mcp_config.json');

// Keep the process alive for a few seconds to see if it launches at all
setTimeout(() => {
  console.log('[MCP Server Test] Process exiting after timeout.');
  process.exit(0);
}, 5000); // 5 seconds

// Platform-independent entry point
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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

const logFilePath = path.join(__dirname, 'mcp-startup.log');

// Simple file logger
function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`, 'utf8');
  } catch (err: any) {
    const errorMsg = `[File Log Error] Failed to write to ${logFilePath}: ${err?.message || err}`;
    console.error(errorMsg);
    if (err?.stack) {
      console.error(err.stack);
    }
    console.error(`[Original Message] ${message}`);
  }
}

// Clear log file on startup
try { fs.writeFileSync(logFilePath, '', 'utf8'); } catch {} 

// Add a global handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  logToFile('FATAL: Uncaught Exception: ' + (error?.message || error));
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

const server = new Server(
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

// Restore ListTools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logToFile('[MCP Server Log] Received ListTools request.'); 
  return {
    tools: [
       {
        toolId: "list_workflows",
        description: "List workflows in a GitHub repository",
        inputSchema: zodToJsonSchema(actions.ListWorkflowsSchema),
      },
      {
        toolId: "get_workflow",
        description: "Get details of a specific workflow",
        inputSchema: zodToJsonSchema(actions.GetWorkflowSchema),
      },
      {
        toolId: "get_workflow_usage",
        description: "Get usage statistics of a workflow",
        inputSchema: zodToJsonSchema(actions.GetWorkflowUsageSchema),
      },
      {
        toolId: "list_workflow_runs",
        description: "List all workflow runs for a repository or a specific workflow",
        inputSchema: zodToJsonSchema(actions.ListWorkflowRunsSchema),
      },
      {
        toolId: "get_workflow_run",
        description: "Get details of a specific workflow run",
        inputSchema: zodToJsonSchema(actions.GetWorkflowRunSchema),
      },
      {
        toolId: "get_workflow_run_jobs",
        description: "Get jobs for a specific workflow run",
        inputSchema: zodToJsonSchema(actions.GetWorkflowRunJobsSchema),
      },
      {
        toolId: "trigger_workflow",
        description: "Trigger a workflow run",
        inputSchema: zodToJsonSchema(actions.TriggerWorkflowSchema),
      },
      {
        toolId: "cancel_workflow_run",
        description: "Cancel a workflow run",
        inputSchema: zodToJsonSchema(actions.CancelWorkflowRunSchema),
      },
      {
        toolId: "rerun_workflow",
        description: "Re-run a workflow run",
        inputSchema: zodToJsonSchema(actions.RerunWorkflowSchema),
      },
    ]
  };
});

// Restore full CallTool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  logToFile(`[MCP Server Log] Received CallTool request for tool: ${request.params.toolId}`); 
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.toolId) { 
      case "list_workflows": {
        const args = actions.ListWorkflowsSchema.parse(request.params.arguments);
        const result = await actions.listWorkflows(
          args.owner,
          args.repo,
          args.page,
          args.perPage
        );
        return { content: [{ type: "text", text: JSON.stringify(result) }] }; 
      }
      
      case "get_workflow": {
        const args = actions.GetWorkflowSchema.parse(request.params.arguments);
        const result = await actions.getWorkflow(
          args.owner,
          args.repo,
          args.workflowId
        );
         return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      
      case "get_workflow_usage": {
        const args = actions.GetWorkflowUsageSchema.parse(request.params.arguments);
        const result = await actions.getWorkflowUsage(
          args.owner,
          args.repo,
          args.workflowId
        );
         return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      
      case "list_workflow_runs": {
        const args = actions.ListWorkflowRunsSchema.parse(request.params.arguments);
        const { owner, repo, workflowId, ...options } = args;
        const result = await actions.listWorkflowRuns(owner, repo, {
          workflowId,
          ...options
        });
         return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      
      case "get_workflow_run": {
        const args = actions.GetWorkflowRunSchema.parse(request.params.arguments);
        const result = await actions.getWorkflowRun(
          args.owner,
          args.repo,
          args.runId
        );
         return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      
      case "get_workflow_run_jobs": {
        const args = actions.GetWorkflowRunJobsSchema.parse(request.params.arguments);
        const { owner, repo, runId, filter, page, perPage } = args;
        const result = await actions.getWorkflowRunJobs(
          owner,
          repo,
          runId,
          filter,
          page,
          perPage
        );
         return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      
      case "trigger_workflow": {
        const args = actions.TriggerWorkflowSchema.parse(request.params.arguments);
        const { owner, repo, workflowId, ref, inputs } = args;
        const result = await actions.triggerWorkflow(
          owner,
          repo,
          workflowId,
          ref,
          inputs
        );
         return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      
      case "cancel_workflow_run": {
        const args = actions.CancelWorkflowRunSchema.parse(request.params.arguments);
        const result = await actions.cancelWorkflowRun(
          args.owner,
          args.repo,
          args.runId
        );
         return { content: [{ type: "text", text: JSON.stringify(result) }] }; 
      }
      
      case "rerun_workflow": {
        const args = actions.RerunWorkflowSchema.parse(request.params.arguments);
        const result = await actions.rerunWorkflowRun( 
          args.owner,
          args.repo,
          args.runId
        );
         return { content: [{ type: "text", text: JSON.stringify(result) }] }; 
      }

      default:
         logToFile(`[MCP Server Log] Unknown tool requested: ${request.params.toolId}`);
         throw new Error(`Unknown tool ID: ${request.params.toolId}`);
    }
  } catch (error: any) {
    logToFile(`[MCP Server Log] Error in CallTool handler for ${request.params.toolId}: ${error?.message || error}`); 
    if (error?.stack) {
      logToFile('CallTool Error Stack Trace: ' + error.stack);
    }
    // Restore full error handling
     if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    if (isGitHubError(error)) {
      throw new Error(formatGitHubError(error));
    }
    throw error; 
  }
});

async function runServer() {
  logToFile('[MCP Server Log] Entering runServer function...'); 
  try {
    logToFile('[MCP Server Log] Creating StdioServerTransport...');
    const transport = new StdioServerTransport();
    logToFile('[MCP Server Log] Starting server connection...');
    await server.connect(transport);
    logToFile('[MCP Server Log] Server connection established.');
    
    // Attempt to keep the process alive explicitly
    logToFile('[MCP Server Log] Calling process.stdin.resume()...');
    process.stdin.resume();
    logToFile('[MCP Server Log] process.stdin.resume() called.');
    
  } catch (error: any) {
    logToFile('[MCP Server Log] Error during server startup/connection: ' + (error?.message || error));
    if (error?.stack) {
      logToFile('Startup Error Stack Trace: ' + error.stack);
    }
    process.exit(1);
  }
}

logToFile('[MCP Server Log] Calling runServer...');
runServer().catch((error: any) => {
  logToFile("Fatal error in main(): " + (error?.message || error));
  if (error?.stack) {
    logToFile('Main Catch Stack Trace: ' + error.stack);
  }
  process.exit(1);
});