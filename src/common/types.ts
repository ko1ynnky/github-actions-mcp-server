import { z } from "zod";

// Base GitHub types
export const GitHubAuthorSchema = z.object({
  name: z.string(),
  email: z.string(),
  date: z.string().optional(),
}).passthrough();

// GitHub Workflow Run types
export const WorkflowRunSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  node_id: z.string(),
  head_branch: z.string().nullable(),
  head_sha: z.string(),
  path: z.string(),
  display_title: z.string().nullable(),
  run_number: z.number(),
  event: z.string(),
  status: z.string().nullable(),
  conclusion: z.string().nullable(),
  workflow_id: z.number(),
  check_suite_id: z.number(),
  check_suite_node_id: z.string(),
  url: z.string(),
  html_url: z.string(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  run_attempt: z.number(),
  run_started_at: z.string().nullable().optional(),
  jobs_url: z.string(),
  logs_url: z.string(),
  check_suite_url: z.string(),
  artifacts_url: z.string(),
  cancel_url: z.string(),
  rerun_url: z.string(),
  previous_attempt_url: z.string().nullable(),
  workflow_url: z.string(),
  repository: z.object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    full_name: z.string(),
    owner: z.object({
      login: z.string(),
      id: z.number(),
      node_id: z.string(),
      avatar_url: z.string(),
      url: z.string(),
      html_url: z.string(),
      type: z.string(),
    }).passthrough(),
    html_url: z.string(),
    description: z.string().nullable(),
    fork: z.boolean(),
    url: z.string(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  }).passthrough(),
  head_repository: z.object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    full_name: z.string(),
    owner: z.object({
      login: z.string(),
      id: z.number(),
      node_id: z.string(),
      avatar_url: z.string(),
      url: z.string(),
      html_url: z.string(),
      type: z.string(),
    }).passthrough(),
    html_url: z.string(),
    description: z.string().nullable(),
    fork: z.boolean(),
    url: z.string(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  }).passthrough(),
}).passthrough();

export const WorkflowRunsSchema = z.object({
  total_count: z.number(),
  workflow_runs: z.array(WorkflowRunSchema),
}).passthrough();

// GitHub Workflow Job types
export const JobSchema = z.object({
  id: z.number(),
  run_id: z.number(),
  workflow_name: z.string(),
  head_branch: z.string(),
  run_url: z.string(),
  run_attempt: z.number(),
  node_id: z.string(),
  head_sha: z.string(),
  url: z.string(),
  html_url: z.string(),
  status: z.string(),
  conclusion: z.string().nullable(),
  created_at: z.string(),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  name: z.string(),
  steps: z.array(
    z.object({
      name: z.string(),
      status: z.string(),
      conclusion: z.string().nullable(),
      number: z.number(),
      started_at: z.string().nullable(),
      completed_at: z.string().nullable(),
    }).passthrough()
  ),
  check_run_url: z.string(),
  labels: z.array(z.string()),
  runner_id: z.number().nullable(),
  runner_name: z.string().nullable(),
  runner_group_id: z.number().nullable(),
  runner_group_name: z.string().nullable(),
}).passthrough();

export const JobsSchema = z.object({
  total_count: z.number(),
  jobs: z.array(JobSchema),
}).passthrough();

// GitHub Workflow types
export const WorkflowSchema = z.object({
  id: z.number(),
  node_id: z.string(),
  name: z.string(),
  path: z.string(),
  state: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  url: z.string(),
  html_url: z.string(),
  badge_url: z.string(),
}).passthrough();

export const WorkflowsSchema = z.object({
  total_count: z.number(),
  workflows: z.array(WorkflowSchema),
}).passthrough();

// GitHub Workflow Usage types
export const WorkflowUsageSchema = z.object({
  billable: z.object({
    UBUNTU: z.object({
      total_ms: z.number().optional(),
      jobs: z.number().optional(),
    }).passthrough().optional(),
    MACOS: z.object({
      total_ms: z.number().optional(),
      jobs: z.number().optional(),
    }).passthrough().optional(),
    WINDOWS: z.object({
      total_ms: z.number().optional(),
      jobs: z.number().optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough();

export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;
export type WorkflowRunsResponse = z.infer<typeof WorkflowRunsSchema>;
export type Job = z.infer<typeof JobSchema>;
export type JobsResponse = z.infer<typeof JobsSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowsResponse = z.infer<typeof WorkflowsSchema>;
export type WorkflowUsage = z.infer<typeof WorkflowUsageSchema>;