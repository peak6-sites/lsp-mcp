# LSP MCP Server Quick Start

This guide will help you get the LSP MCP Server running in 5 minutes.

## Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- At least one language server installed (e.g., `typescript-language-server`)

## Step 1: Install and Build

```bash
# Clone or navigate to the lsp-mcp-server directory
cd lsp-mcp-server

# Install dependencies
npm install

# Build the server
npm run build
```

## Step 2: Install a Language Server (if needed)

For TypeScript/JavaScript:
```bash
npm install -g typescript-language-server typescript
```

For Python:
```bash
pip install python-lsp-server
```

## Step 3: Test the Server Standalone

```bash
# Make sure it runs without errors
node build/index.js
# Press Ctrl+C to stop
```

## Step 4: Configure Your MCP Client

Add to your MCP settings file:

```json
{
  "mcpServers": {
    "lsp": {
      "command": "node",
      "args": ["/absolute/path/to/lsp-mcp-server/build/index.js"]
    }
  }
}
```

## Step 5: Basic Usage Example

Here's a simple example of using the LSP server with TypeScript:

### Start a Language Server
```json
{
  "tool": "lsp_start_server",
  "arguments": {
    "language": "typescript",
    "workspaceUri": "file:///your/project/path"
  }
}
```

### Open a Document
```json
{
  "tool": "lsp_open_document",
  "arguments": {
    "serverId": "returned-server-id",
    "fileUri": "file:///your/project/path/index.ts",
    "content": "const message: string = 'Hello World';\nconsole.log(message);",
    "languageId": "typescript"
  }
}
```

### Get Completions
```json
{
  "tool": "lsp_get_completions",
  "arguments": {
    "serverId": "returned-server-id",
    "fileUri": "file:///your/project/path/index.ts",
    "line": 1,
    "character": 8  // After "console."
  }
}
```

## Complete Working Example

Here's a complete example that you can run:

```javascript
// example.js
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Create a test workspace
const workspace = '/tmp/lsp-test';
mkdirSync(workspace, { recursive: true });

// Create a test file
const testFile = join(workspace, 'test.ts');
writeFileSync(testFile, `
interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}

const user: User = {
  name: "Alice",
  age: 25
};

console.log(greet(user));
`);

console.log('Test workspace created at:', workspace);
console.log('Test file created at:', testFile);

// Now you can use these paths with the LSP MCP server:
console.log('\nUse these values in your MCP client:');
console.log('- workspaceUri:', `file://${workspace}`);
console.log('- fileUri:', `file://${testFile}`);
```

## Verifying It Works

You should see responses like:

1. **Server Start Response:**
```json
{
  "serverId": "uuid-here",
  "status": "started",
  "language": "typescript",
  "workspace": "file:///tmp/lsp-test"
}
```

2. **Completion Response:**
```json
{
  "isIncomplete": false,
  "items": [
    {
      "label": "log",
      "kind": 2,
      "detail": "(method) Console.log(...data: any[]): void"
    },
    {
      "label": "error",
      "kind": 2,
      "detail": "(method) Console.error(...data: any[]): void"
    }
    // ... more completions
  ]
}
```

## Common Issues

### "Language server not found"
- Make sure the language server is installed globally
- Check that it's in your PATH: `which typescript-language-server`

### "No completions returned"
- Ensure the document is opened before requesting completions
- Check that the line and character positions are correct
- Verify the file URI matches exactly

### "Server crashes immediately"
- Check the server logs for error messages
- Ensure all dependencies are installed: `npm install`
- Try rebuilding: `npm run build`

## Next Steps

- Read the [Integration Guide](../docs/integration-guide.md) for advanced usage
- Check the [README](../README.md) for all available tools
- Explore language-specific features for your use case

## Getting Help

If you encounter issues:
1. Check the server stderr output for error messages
2. Enable debug logging with `DEBUG=lsp:*` environment variable
3. Open an issue with reproduction steps