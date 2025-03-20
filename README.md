# GitHub Actions MCP Server

MCP Server for the GitHub Actions API, enabling AI assistants to manage and operate GitHub Actions workflows.

### Features

- **Complete Workflow Management**: List, view, trigger, cancel, and rerun workflows
- **Workflow Run Analysis**: Get detailed information about workflow runs and their jobs
- **Comprehensive Error Handling**: Clear error messages with enhanced details
- **Flexible Type Validation**: Robust type checking with graceful handling of API variations
- **Security-Focused Design**: Timeout handling, rate limiting, and strict URL validation

## Tools

1. `list_workflows`
   - List workflows in a GitHub repository
   - Inputs:
     - `owner` (string): Repository owner (username or organization)
     - `repo` (string): Repository name
     - `page` (optional number): Page number for pagination
     - `perPage` (optional number): Results per page (max 100)
   - Returns: List of workflows in the repository

2. `get_workflow`
   - Get details of a specific workflow
   - Inputs:
     - `owner` (string): Repository owner (username or organization)
     - `repo` (string): Repository name
     - `workflowId` (string or number): The ID of the workflow or filename
   - Returns: Detailed information about the workflow

3. `get_workflow_usage`
   - Get usage statistics of a workflow
   - Inputs:
     - `owner` (string): Repository owner (username or organization)
     - `repo` (string): Repository name
     - `workflowId` (string or number): The ID of the workflow or filename
   - Returns: Usage statistics including billable minutes

4. `list_workflow_runs`
   - List all workflow runs for a repository or a specific workflow
   - Inputs:
     - `owner` (string): Repository owner (username or organization)
     - `repo` (string): Repository name
     - `workflowId` (optional string or number): The ID of the workflow or filename
     - `actor` (optional string): Filter by user who triggered the workflow
     - `branch` (optional string): Filter by branch
     - `event` (optional string): Filter by event type
     - `status` (optional string): Filter by status
     - `created` (optional string): Filter by creation date (YYYY-MM-DD)
     - `excludePullRequests` (optional boolean): Exclude PR-triggered runs
     - `checkSuiteId` (optional number): Filter by check suite ID
     - `page` (optional number): Page number for pagination
     - `perPage` (optional number): Results per page (max 100)
   - Returns: List of workflow runs matching the criteria

5. `get_workflow_run`
   - Get details of a specific workflow run
   - Inputs:
     - `owner` (string): Repository owner (username or organization)
     - `repo` (string): Repository name
     - `runId` (number): The ID of the workflow run
   - Returns: Detailed information about the specific workflow run

6. `get_workflow_run_jobs`
   - Get jobs for a specific workflow run
   - Inputs:
     - `owner` (string): Repository owner (username or organization)
     - `repo` (string): Repository name
     - `runId` (number): The ID of the workflow run
     - `filter` (optional string): Filter jobs by completion status ('latest', 'all')
     - `page` (optional number): Page number for pagination
     - `perPage` (optional number): Results per page (max 100)
   - Returns: List of jobs in the workflow run

7. `trigger_workflow`
   - Trigger a workflow run
   - Inputs:
     - `owner` (string): Repository owner (username or organization)
     - `repo` (string): Repository name
     - `workflowId` (string or number): The ID of the workflow or filename
     - `ref` (string): The reference to run the workflow on (branch, tag, or SHA)
     - `inputs` (optional object): Input parameters for the workflow
   - Returns: Information about the triggered workflow run

8. `cancel_workflow_run`
   - Cancel a workflow run
   - Inputs:
     - `owner` (string): Repository owner (username or organization)
     - `repo` (string): Repository name
     - `runId` (number): The ID of the workflow run
   - Returns: Status of the cancellation operation

9. `rerun_workflow`
   - Re-run a workflow run
   - Inputs:
     - `owner` (string): Repository owner (username or organization)
     - `repo` (string): Repository name
     - `runId` (number): The ID of the workflow run
   - Returns: Status of the re-run operation

### Usage with Claude Desktop

First, make sure you have built the project (see Build section below). Then, add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "github-actions": {
      "command": "node",
      "args": [
        "<path-to-your-project>/dist/index.js"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    }
  }
}
```

## Build

Clone the repository and build:

```bash
git clone https://github.com/your-username/github-actions-mcp.git
cd github-actions-mcp
npm install
npm run build
```

This will create the necessary files in the `dist` directory that you'll need to run the MCP server.

## Usage Examples

List workflows in a repository:

```javascript
const result = await listWorkflows({
  owner: "your-username",
  repo: "your-repository"
});
```

Trigger a workflow:

```javascript
const result = await triggerWorkflow({
  owner: "your-username",
  repo: "your-repository",
  workflowId: "ci.yml",
  ref: "main",
  inputs: {
    environment: "production"
  }
});
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Ensure your GitHub token has the correct permissions
   - Check that the token is correctly set as an environment variable

2. **Rate Limiting**:
   - The server implements rate limiting to avoid hitting GitHub API limits
   - If you encounter rate limit errors, reduce the frequency of requests

3. **Type Validation Errors**:
   - GitHub API responses might sometimes differ from expected schemas
   - The server implements flexible validation to handle most variations
   - If you encounter persistent errors, please open an issue

## License

This MCP server is licensed under the MIT License.