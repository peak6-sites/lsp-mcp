# LSP MCP Server

A Model Context Protocol (MCP) server that provides Language Server Protocol (LSP) functionality to AI code editors. This server acts as a bridge between AI assistants and language servers, enabling advanced code intelligence features.

## Features

The LSP MCP Server exposes the following tools:

### Server Management
- **lsp_start_server** - Start a language server for a specific programming language
- **lsp_stop_server** - Stop a running language server
- **lsp_list_servers** - List all active language servers

### Document Management
- **lsp_open_document** - Open a document in the language server
- **lsp_update_document** - Update document content
- **lsp_close_document** - Close a document

### Code Intelligence
- **lsp_get_diagnostics** - Get errors and warnings for a file
- **lsp_get_completions** - Get code completions at a specific position
- **lsp_get_hover** - Get hover information (documentation, types)
- **lsp_go_to_definition** - Find where a symbol is defined
- **lsp_find_references** - Find all references to a symbol
- **lsp_get_symbols** - Get document symbols (classes, functions, etc.)

### Code Actions
- **lsp_rename_symbol** - Rename a symbol across the workspace
- **lsp_format_document** - Format an entire document

## Supported Languages

The server comes pre-configured with support for:
- TypeScript/JavaScript (`typescript-language-server`)
- Python (`pylsp`)
- Rust (`rust-analyzer`)
- Go (`gopls`)
- Java (`jdtls`)
- C/C++ (`clangd`)

You can also use custom language servers by providing the command and arguments.

## Installation

1. Install dependencies:
```bash
cd lsp-mcp-server
npm install
```

2. Build the server:
```bash
npm run build
```

3. Install required language servers:
```bash
# TypeScript
npm install -g typescript-language-server typescript

# Python
pip install python-lsp-server

# Rust
rustup component add rust-analyzer

# Go
go install golang.org/x/tools/gopls@latest

# C/C++
# Install clangd from your package manager or LLVM releases
```

## Configuration

Add the server to your MCP settings file:

```json
{
  "mcpServers": {
    "lsp": {
      "command": "node",
      "args": ["/path/to/lsp-mcp-server/build/index.js"]
    }
  }
}
```

## Usage Examples

### Starting a TypeScript Language Server

```javascript
// Start server
{
  "tool": "lsp_start_server",
  "arguments": {
    "language": "typescript",
    "workspaceUri": "file:///path/to/project"
  }
}
// Returns: { "serverId": "uuid-here", "status": "started" }

// Open a document
{
  "tool": "lsp_open_document",
  "arguments": {
    "serverId": "uuid-here",
    "fileUri": "file:///path/to/project/src/index.ts",
    "content": "const x = 1;\nconsole.log(x);",
    "languageId": "typescript"
  }
}

// Get completions
{
  "tool": "lsp_get_completions",
  "arguments": {
    "serverId": "uuid-here",
    "fileUri": "file:///path/to/project/src/index.ts",
    "line": 1,
    "character": 8
  }
}
```

### Working with Python

```javascript
// Start Python server
{
  "tool": "lsp_start_server",
  "arguments": {
    "language": "python",
    "workspaceUri": "file:///path/to/python/project"
  }
}

// Get hover information
{
  "tool": "lsp_get_hover",
  "arguments": {
    "serverId": "python-server-id",
    "fileUri": "file:///path/to/main.py",
    "line": 10,
    "character": 15
  }
}
```

### Custom Language Server

```javascript
// Start a custom language server
{
  "tool": "lsp_start_server",
  "arguments": {
    "language": "custom",
    "workspaceUri": "file:///path/to/workspace",
    "serverCommand": "/path/to/custom-lsp",
    "serverArgs": ["--stdio", "--verbose"]
  }
}
```

## Development

To run in development mode with auto-reload:
```bash
npm run dev
```

## Architecture

The LSP MCP Server consists of three main components:

1. **MCP Server (index.ts)** - Handles MCP protocol communication and tool definitions
2. **LSP Manager (lsp-manager.ts)** - Manages language server processes and LSP communication
3. **FileSystem Manager (filesystem-manager.ts)** - Handles file operations and URI conversions

The server uses stdio for communication with both the MCP client and language servers, ensuring compatibility with the widest range of tools.

## Troubleshooting

### Language Server Not Starting
- Ensure the language server is installed and available in PATH
- Check the server logs for error messages
- Try using a custom command with full path

### No Completions/Features Working
- Make sure to open documents before requesting features
- Verify the workspace URI is correct
- Check that the language server supports the requested feature

### Performance Issues
- Consider limiting the number of concurrent language servers
- Close unused documents to free memory
- Use workspace-specific servers instead of global ones

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT