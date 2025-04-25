// Platform-independent entry point
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import * as actions from './operations/actions.js';
import {
  GitHubError,
  GitHubValidationError,
  GitHubResourceNotFoundError,
  GitHubAuthenticationError,
  GitHubPermissionError,
  GitHubRateLimitError,
  GitHubConflictError,
  GitHubTimeoutError,
  GitHubNetworkError,
  isGitHubError,
} from './common/errors.js';
import { VERSION } from "./common/version.js";

const server = new Server(
  {
    name: "github-actions-mcp-server",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

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

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_workflows",
        description: "List workflows in a GitHub repository",
        inputSchema: zodToJsonSchema(actions.ListWorkflowsSchema),
      },
      {
        name: "get_workflow",
        description: "Get details of a specific workflow",
        inputSchema: zodToJsonSchema(actions.GetWorkflowSchema),
      },
      {
        name: "get_workflow_usage",
        description: "Get usage statistics of a workflow",
        inputSchema: zodToJsonSchema(actions.GetWorkflowUsageSchema),
      },
      {
        name: "list_workflow_runs",
        description: "List all workflow runs for a repository or a specific workflow",
        inputSchema: zodToJsonSchema(actions.ListWorkflowRunsSchema),
      },
      {
        name: "get_workflow_run",
        description: "Get details of a specific workflow run",
        inputSchema: zodToJsonSchema(actions.GetWorkflowRunSchema),
      },
      {
        name: "get_workflow_run_jobs",
        description: "Get jobs for a specific workflow run",
        inputSchema: zodToJsonSchema(actions.GetWorkflowRunJobsSchema),
      },
      {
        name: "trigger_workflow",
        description: "Trigger a workflow run",
        inputSchema: zodToJsonSchema(actions.TriggerWorkflowSchema),
      },
      {
        name: "cancel_workflow_run",
        description: "Cancel a workflow run",
        inputSchema: zodToJsonSchema(actions.CancelWorkflowRunSchema),
      },
      {
        name: "rerun_workflow",
        description: "Re-run a workflow run",
        inputSchema: zodToJsonSchema(actions.RerunWorkflowSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {
      case "list_workflows": {
        const args = actions.ListWorkflowsSchema.parse(request.params.arguments);
        const result = await actions.listWorkflows(
          args.owner,
          args.repo,
          args.page,
          args.perPage
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      
      case "get_workflow": {
        const args = actions.GetWorkflowSchema.parse(request.params.arguments);
        const result = await actions.getWorkflow(
          args.owner,
          args.repo,
          args.workflowId
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      
      case "get_workflow_usage": {
        const args = actions.GetWorkflowUsageSchema.parse(request.params.arguments);
        const result = await actions.getWorkflowUsage(
          args.owner,
          args.repo,
          args.workflowId
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      
      case "list_workflow_runs": {
        const args = actions.ListWorkflowRunsSchema.parse(request.params.arguments);
        const { owner, repo, workflowId, ...options } = args;
        const result = await actions.listWorkflowRuns(owner, repo, {
          workflowId,
          ...options
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      
      case "get_workflow_run": {
        const args = actions.GetWorkflowRunSchema.parse(request.params.arguments);
        const result = await actions.getWorkflowRun(
          args.owner,
          args.repo,
          args.runId
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
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
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
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
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      
      case "cancel_workflow_run": {
        const args = actions.CancelWorkflowRunSchema.parse(request.params.arguments);
        const result = await actions.cancelWorkflowRun(
          args.owner,
          args.repo,
          args.runId
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      
      case "rerun_workflow": {
        const args = actions.RerunWorkflowSchema.parse(request.params.arguments);
        const result = await actions.rerunWorkflowRun(
          args.owner,
          args.repo,
          args.runId
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitHub Actions MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});