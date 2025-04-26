import { z } from "zod";
import { githubRequest, buildUrl, validateOwnerName, validateRepositoryName } from "../common/utils.js";
import {
  WorkflowRunsSchema,
  WorkflowRunSchema,
  JobsSchema,
  WorkflowsSchema,
  WorkflowSchema,
  WorkflowUsageSchema
} from "../common/types.js";

/**
 * Schema definitions
 */

// List workflows schemas
export const ListWorkflowsSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  page: z.number().optional().describe("Page number for pagination"),
  perPage: z.number().optional().describe("Results per page (max 100)"),
});

// Get workflow schema
export const GetWorkflowSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  workflowId: z.union([z.string(), z.number()]).describe("The ID of the workflow or filename"),
});

// Get workflow usage schema
export const GetWorkflowUsageSchema = GetWorkflowSchema;

// List workflow runs schema
export const ListWorkflowRunsSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  workflowId: z.union([z.string(), z.number()]).optional().describe("The ID of the workflow or filename"),
  actor: z.string().optional().describe("Returns someone's workflow runs. Use the login for the user"),
  branch: z.string().optional().describe("Returns workflow runs associated with a branch"),
  event: z.string().optional().describe("Returns workflow runs triggered by the event"),
  status: z.enum(['completed', 'action_required', 'cancelled', 'failure', 'neutral', 'skipped', 'stale', 'success', 'timed_out', 'in_progress', 'queued', 'requested', 'waiting', 'pending']).optional().describe("Returns workflow runs with the check run status"),
  created: z.string().optional().describe("Returns workflow runs created within date range (YYYY-MM-DD)"),
  excludePullRequests: z.boolean().optional().describe("If true, pull requests are omitted from the response"),
  checkSuiteId: z.number().optional().describe("Returns workflow runs with the check_suite_id"),
  page: z.number().optional().describe("Page number for pagination"),
  perPage: z.number().optional().describe("Results per page (max 100)"),
});

// Get workflow run schema
export const GetWorkflowRunSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  runId: z.number().describe("The ID of the workflow run"),
});

// Get workflow run jobs schema
export const GetWorkflowRunJobsSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  runId: z.number().describe("The ID of the workflow run"),
  filter: z.enum(['latest', 'all']).optional().describe("Filter jobs by their completed_at date"),
  page: z.number().optional().describe("Page number for pagination"),
  perPage: z.number().optional().describe("Results per page (max 100)"),
});

// Trigger workflow schema
export const TriggerWorkflowSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  workflowId: z.union([z.string(), z.number()]).describe("The ID of the workflow or filename"),
  ref: z.string().describe("The reference of the workflow run (branch, tag, or SHA)"),
  inputs: z.record(z.string()).optional().describe("Input parameters for the workflow"),
});

// Cancel workflow run schema
export const CancelWorkflowRunSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  runId: z.number().describe("The ID of the workflow run"),
});

// Rerun workflow schema
export const RerunWorkflowSchema = CancelWorkflowRunSchema;

// Define response types
export type WorkflowsResponse = z.infer<typeof WorkflowsSchema>;
export type WorkflowResponse = z.infer<typeof WorkflowSchema>;
export type WorkflowUsageResponse = z.infer<typeof WorkflowUsageSchema>;
export type WorkflowRunsResponse = z.infer<typeof WorkflowRunsSchema>;
export type WorkflowRunResponse = z.infer<typeof WorkflowRunSchema>;
export type JobsResponse = z.infer<typeof JobsSchema>;
export type SuccessResponse = { success: boolean; message: string };

/**
 * Function implementations
 */

/**
 * List workflows in a repository
 * 
 * @param owner Repository owner (username or organization)
 * @param repo Repository name 
 * @param page Optional page number for pagination
 * @param perPage Optional results per page (max 100)
 * @returns Workflows listing information
 */
export async function listWorkflows(
  owner: string, 
  repo: string, 
  page?: number, 
  perPage?: number
): Promise<WorkflowsResponse> {
  owner = validateOwnerName(owner);
  repo = validateRepositoryName(repo);

  const url = buildUrl(`https://api.github.com/repos/${owner}/${repo}/actions/workflows`, {
    page: page,
    per_page: perPage
  });

  const response = await githubRequest(url);
  return WorkflowsSchema.parse(response);
}

/**
 * Get a specific workflow by ID or filename
 * 
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 * @param workflowId The ID of the workflow or filename
 * @returns Workflow details
 */
export async function getWorkflow(
  owner: string, 
  repo: string, 
  workflowId: string | number
): Promise<WorkflowResponse> {
  owner = validateOwnerName(owner);
  repo = validateRepositoryName(repo);

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}`;
  const response = await githubRequest(url);
  return WorkflowSchema.parse(response);
}

/**
 * Get usage statistics of a workflow
 * 
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 * @param workflowId The ID of the workflow or filename
 * @returns Workflow usage statistics
 */
export async function getWorkflowUsage(
  owner: string, 
  repo: string, 
  workflowId: string | number
): Promise<WorkflowUsageResponse> {
  owner = validateOwnerName(owner);
  repo = validateRepositoryName(repo);

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/timing`;
  const response = await githubRequest(url);
  return WorkflowUsageSchema.parse(response);
}

/**
 * List workflow runs with filtering options
 * 
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 * @param options Filter options including workflowId, actor, branch, etc.
 * @returns List of workflow runs matching the criteria
 */
export async function listWorkflowRuns(
  owner: string, 
  repo: string, 
  options: {
    workflowId?: string | number,
    actor?: string,
    branch?: string,
    event?: string,
    status?: string,
    created?: string,
    excludePullRequests?: boolean,
    checkSuiteId?: number,
    page?: number,
    perPage?: number
  } = {}
): Promise<WorkflowRunsResponse> {
  owner = validateOwnerName(owner);
  repo = validateRepositoryName(repo);

  let url;
  if (options.workflowId) {
    url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${options.workflowId}/runs`;
  } else {
    url = `https://api.github.com/repos/${owner}/${repo}/actions/runs`;
  }

  url = buildUrl(url, {
    actor: options.actor,
    branch: options.branch,
    event: options.event,
    status: options.status,
    created: options.created,
    exclude_pull_requests: options.excludePullRequests ? "true" : undefined,
    check_suite_id: options.checkSuiteId,
    page: options.page,
    per_page: options.perPage
  });

  const response = await githubRequest(url);
  return WorkflowRunsSchema.parse(response);
}

/**
 * Get details of a specific workflow run
 * 
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 * @param runId The ID of the workflow run
 * @returns Workflow run details
 */
export async function getWorkflowRun(
  owner: string, 
  repo: string, 
  runId: number
): Promise<WorkflowRunResponse> {
  owner = validateOwnerName(owner);
  repo = validateRepositoryName(repo);

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`;
  const response = await githubRequest(url);
  return WorkflowRunSchema.parse(response);
}

/**
 * Get jobs for a specific workflow run
 * 
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 * @param runId The ID of the workflow run
 * @param filter Optional filter for jobs (latest or all)
 * @param page Optional page number for pagination
 * @param perPage Optional results per page (max 100)
 * @returns List of jobs for the workflow run
 */
export async function getWorkflowRunJobs(
  owner: string, 
  repo: string, 
  runId: number, 
  filter?: 'latest' | 'all', 
  page?: number, 
  perPage?: number
): Promise<JobsResponse> {
  owner = validateOwnerName(owner);
  repo = validateRepositoryName(repo);

  const url = buildUrl(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, {
    filter: filter,
    page: page,
    per_page: perPage
  });

  const response = await githubRequest(url);
  return JobsSchema.parse(response);
}

/**
 * Trigger a workflow run
 * 
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 * @param workflowId The ID of the workflow or filename
 * @param ref The reference to run the workflow on (branch, tag, or SHA)
 * @param inputs Optional input parameters for the workflow
 * @returns Success status and message
 */
export async function triggerWorkflow(
  owner: string, 
  repo: string, 
  workflowId: string | number, 
  ref: string, 
  inputs?: Record<string, string>
): Promise<SuccessResponse> {
  owner = validateOwnerName(owner);
  repo = validateRepositoryName(repo);

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;
  
  const body: {
    ref: string;
    inputs?: Record<string, string>;
  } = { ref };
  
  if (inputs && Object.keys(inputs).length > 0) {
    body.inputs = inputs;
  }

  await githubRequest(url, {
    method: 'POST',
    body
  });

  // This endpoint doesn't return any data on success
  return { success: true, message: `Workflow ${workflowId} triggered on ${ref}` };
}

/**
 * Cancel a workflow run
 * 
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 * @param runId The ID of the workflow run
 * @returns Success status and message
 */
export async function cancelWorkflowRun(
  owner: string, 
  repo: string, 
  runId: number
): Promise<SuccessResponse> {
  owner = validateOwnerName(owner);
  repo = validateRepositoryName(repo);

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/cancel`;
  await githubRequest(url, { method: 'POST' });

  // This endpoint doesn't return any data on success
  return { success: true, message: `Workflow run ${runId} cancelled` };
}

/**
 * Rerun a workflow run
 * 
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 * @param runId The ID of the workflow run
 * @returns Success status and message
 */
export async function rerunWorkflowRun(
  owner: string, 
  repo: string, 
  runId: number
): Promise<SuccessResponse> {
  owner = validateOwnerName(owner);
  repo = validateRepositoryName(repo);

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/rerun`;
  await githubRequest(url, { method: 'POST' });

  // This endpoint doesn't return any data on success
  return { success: true, message: `Workflow run ${runId} restarted` };
}