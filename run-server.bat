@echo off
echo GitHub Actions MCP Server for Windows
echo ----------------------------------

rem Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

rem Check if dist folder exists; if not, build the project
if not exist dist (
    echo Building project...
    call npm run build:win
    if %ERRORLEVEL% neq 0 (
        echo Build failed. Please check for errors.
        exit /b 1
    )
)

rem Set GitHub Personal Access Token if provided as command line argument
if not "%~1"=="" (
    set GITHUB_PERSONAL_ACCESS_TOKEN=%~1
    echo Using provided GitHub Personal Access Token
) else (
    if defined GITHUB_PERSONAL_ACCESS_TOKEN (
        echo Using GitHub Personal Access Token from environment
    ) else (
        echo No GitHub Personal Access Token provided
        echo Some API calls may be rate-limited
    )
)

echo Starting MCP server...
echo Listening on stdio...
echo Press Ctrl+C to stop the server

node dist/index.js

echo Server stopped
