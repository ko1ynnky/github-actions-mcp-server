#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from 'zod';

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
import { createToolResponse, createErrorResponse } from "./common/utils.js";

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

/**
 * Handle errors in a consistent way
 * 
 * @param error The error to handle
 * @returns An appropriate error message
 * @throws Error with formatted message
 */
const errorHandler = (error: unknown) => {
  if (error instanceof z.ZodError) {
    return new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
  }
  if (isGitHubError(error)) {
    return new Error(formatGitHubError(error as GitHubError));
  }
  return error instanceof Error ? error : new Error(String(error));
};

// Create the MCP server
const server = new McpServer({
  name: "github-actions-mcp-server",
  version: VERSION,
}, {
  capabilities: {
    tools: {},
  },
});

// Type definitions for tool parameters
type ListWorkflowsParams = z.infer<typeof actions.ListWorkflowsSchema>;
type GetWorkflowParams = z.infer<typeof actions.GetWorkflowSchema>;
type GetWorkflowUsageParams = z.infer<typeof actions.GetWorkflowUsageSchema>;
type ListWorkflowRunsParams = z.infer<typeof actions.ListWorkflowRunsSchema>;
type GetWorkflowRunParams = z.infer<typeof actions.GetWorkflowRunSchema>;
type GetWorkflowRunJobsParams = z.infer<typeof actions.GetWorkflowRunJobsSchema>;
type TriggerWorkflowParams = z.infer<typeof actions.TriggerWorkflowSchema>;
type CancelWorkflowRunParams = z.infer<typeof actions.CancelWorkflowRunSchema>;
type RerunWorkflowParams = z.infer<typeof actions.RerunWorkflowSchema>;

/**
 * Register the list_workflows tool
 */
server.tool(
  "list_workflows",
  "List workflows in a GitHub repository",
  actions.ListWorkflowsSchema.shape,
  async (params: ListWorkflowsParams) => {
    try {
      const result = await actions.listWorkflows(
        params.owner,
        params.repo,
        params.page,
        params.perPage
      );
      return createToolResponse(result);
    } catch (error) {
      return createErrorResponse(errorHandler(error));
    }
  },
);

/**
 * Register the get_workflow tool
 */
server.tool(
  "get_workflow",
  "Get details of a specific workflow",
  actions.GetWorkflowSchema.shape,
  async (params: GetWorkflowParams) => {
    try {
      const result = await actions.getWorkflow(
        params.owner,
        params.repo,
        params.workflowId
      );
      return createToolResponse(result);
    } catch (error) {
      return createErrorResponse(errorHandler(error));
    }
  },
);

/**
 * Register the get_workflow_usage tool
 */
server.tool(
  "get_workflow_usage",
  "Get usage statistics of a workflow",
  actions.GetWorkflowUsageSchema.shape,
  async (params: GetWorkflowUsageParams) => {
    try {
      const result = await actions.getWorkflowUsage(
        params.owner,
        params.repo,
        params.workflowId
      );
      return createToolResponse(result);
    } catch (error) {
      return createErrorResponse(errorHandler(error));
    }
  },
);

/**
 * Register the list_workflow_runs tool
 */
server.tool(
  "list_workflow_runs",
  "List all workflow runs for a repository or a specific workflow",
  actions.ListWorkflowRunsSchema.shape,
  async (params: ListWorkflowRunsParams) => {
    try {
      const { owner, repo, workflowId, ...options } = params;
      const result = await actions.listWorkflowRuns(owner, repo, {
        workflowId,
        ...options
      });
      return createToolResponse(result);
    } catch (error) {
      return createErrorResponse(errorHandler(error));
    }
  },
);

/**
 * Register the get_workflow_run tool
 */
server.tool(
  "get_workflow_run",
  "Get details of a specific workflow run",
  actions.GetWorkflowRunSchema.shape,
  async (params: GetWorkflowRunParams) => {
    try {
      const result = await actions.getWorkflowRun(
        params.owner,
        params.repo,
        params.runId
      );
      return createToolResponse(result);
    } catch (error) {
      return createErrorResponse(errorHandler(error));
    }
  },
);

/**
 * Register the get_workflow_run_jobs tool
 */
server.tool(
  "get_workflow_run_jobs",
  "Get details of a specific workflow run",
  actions.GetWorkflowRunJobsSchema.shape,
  async (params: GetWorkflowRunJobsParams) => {
    try {
      const { owner, repo, runId, filter, page, perPage } = params;
      const result = await actions.getWorkflowRunJobs(
        owner,
        repo,
        runId,
        filter,
        page,
        perPage
      );
      return createToolResponse(result);
    } catch (error) {
      return createErrorResponse(errorHandler(error));
    }
  },
);

/**
 * Register the trigger_workflow tool
 */
server.tool(
  "trigger_workflow",
  "Trigger a workflow run",
  actions.TriggerWorkflowSchema.shape,
  async (params: TriggerWorkflowParams) => {
    try {
      const { owner, repo, workflowId, ref, inputs } = params;
      const result = await actions.triggerWorkflow(
        owner,
        repo,
        workflowId,
        ref,
        inputs
      );
      return createToolResponse(result);
    } catch (error) {
      return createErrorResponse(errorHandler(error));
    }
  },
);

/**
 * Register the cancel_workflow_run tool
 */
server.tool(
  "cancel_workflow_run",
  "Cancel a workflow run",
  actions.CancelWorkflowRunSchema.shape,
  async (params: CancelWorkflowRunParams) => {
    try {
      const result = await actions.cancelWorkflowRun(
        params.owner,
        params.repo,
        params.runId
      );
      return createToolResponse(result);
    } catch (error) {
      return createErrorResponse(errorHandler(error));
    }
  },
);

/**
 * Register the rerun_workflow tool
 */
server.tool(
  "rerun_workflow",
  "Re-run a workflow run",
  actions.RerunWorkflowSchema.shape,
  async (params: RerunWorkflowParams) => {
    try {
      const result = await actions.rerunWorkflowRun(
        params.owner,
        params.repo,
        params.runId
      );
      return createToolResponse(result);
    } catch (error) {
      return createErrorResponse(errorHandler(error));
    }
  },
);

/**
 * Start the server with a stdio transport
 */
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitHub Actions MCP Server running on stdio");
}

// Run the server and handle any fatal errors
runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});