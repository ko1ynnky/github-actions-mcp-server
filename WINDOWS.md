# Windows Compatibility Guide

This document provides instructions for running the GitHub Actions MCP Server on Windows systems.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd github-actions-mcp-server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build:win
   ```

## Running the Server

1. Using the batch file (simplest method):
   ```
   run-server.bat [optional-github-token]
   ```
   This will check if the build exists, build if needed, and start the server.

2. Using npm directly:
   ```
   npm run start
   ```

## Setting GitHub Personal Access Token

For full functionality and to avoid rate limiting, you need to set your GitHub Personal Access Token.

Options:
1. Pass it as a parameter to the batch file:
   ```
   run-server.bat your_github_token_here
   ```

2. Set it as an environment variable:
   ```
   set GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here
   npm run start
   ```

## Troubleshooting

If you encounter issues:

1. **Build errors**: Make sure TypeScript is installed correctly.
   ```
   npm install -g typescript
   ```

2. **Permission issues**: Ensure you're running the commands in a command prompt with appropriate permissions.

3. **Node.js errors**: Verify you're using a compatible Node.js version.
   ```
   node --version
   ```
