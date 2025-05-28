# LSP MCP Server Integration Guide

This guide explains how to integrate the LSP MCP Server into your AI code editor.

## Overview

The LSP MCP Server provides a bridge between AI assistants and Language Server Protocol (LSP) servers. It exposes LSP functionality through the Model Context Protocol, allowing AI systems to leverage the same code intelligence features that traditional IDEs use.

## Architecture

```
AI Code Editor <--> MCP Protocol <--> LSP MCP Server <--> LSP Protocol <--> Language Servers
```

## Integration Steps

### 1. Install the Server

```bash
cd lsp-mcp-server
npm install
npm run build
```

### 2. Configure MCP Connection

Add the server to your MCP configuration:

```json
{
  "mcpServers": {
    "lsp": {
      "command": "node",
      "args": ["/absolute/path/to/lsp-mcp-server/build/index.js"],
      "env": {}
    }
  }
}
```

### 3. Available Tools

Once connected, the following tools become available:

#### Server Management
- `lsp_start_server` - Initialize a language server
- `lsp_stop_server` - Terminate a language server
- `lsp_list_servers` - Get active servers

#### Document Operations
- `lsp_open_document` - Register a document with the server
- `lsp_update_document` - Sync document changes
- `lsp_close_document` - Unregister a document

#### Code Intelligence
- `lsp_get_diagnostics` - Retrieve errors/warnings
- `lsp_get_completions` - Get autocomplete suggestions
- `lsp_get_hover` - Get type/documentation info
- `lsp_go_to_definition` - Find symbol definitions
- `lsp_find_references` - Find symbol usages
- `lsp_get_symbols` - Get document outline

#### Refactoring
- `lsp_rename_symbol` - Rename across files
- `lsp_format_document` - Apply code formatting

## Usage Patterns

### Basic Workflow

1. **Start a language server**
```javascript
const response = await useMCPTool('lsp', 'lsp_start_server', {
  language: 'typescript',
  workspaceUri: 'file:///path/to/project'
});
const serverId = response.serverId;
```

2. **Open documents**
```javascript
await useMCPTool('lsp', 'lsp_open_document', {
  serverId,
  fileUri: 'file:///path/to/file.ts',
  content: fileContent,
  languageId: 'typescript'
});
```

3. **Get code intelligence**
```javascript
// Get completions at cursor
const completions = await useMCPTool('lsp', 'lsp_get_completions', {
  serverId,
  fileUri: 'file:///path/to/file.ts',
  line: 10,
  character: 15
});

// Get hover info
const hover = await useMCPTool('lsp', 'lsp_get_hover', {
  serverId,
  fileUri: 'file:///path/to/file.ts',
  line: 10,
  character: 15
});
```

4. **Handle document changes**
```javascript
// Update document after edit
await useMCPTool('lsp', 'lsp_update_document', {
  serverId,
  fileUri: 'file:///path/to/file.ts',
  content: newContent
});

// Get new diagnostics
const diagnostics = await useMCPTool('lsp', 'lsp_get_diagnostics', {
  serverId,
  fileUri: 'file:///path/to/file.ts'
});
```

### Advanced Features

#### Multi-file Refactoring
```javascript
// Find all references
const refs = await useMCPTool('lsp', 'lsp_find_references', {
  serverId,
  fileUri: 'file:///path/to/file.ts',
  line: 20,
  character: 10,
  includeDeclaration: true
});

// Rename symbol
const edits = await useMCPTool('lsp', 'lsp_rename_symbol', {
  serverId,
  fileUri: 'file:///path/to/file.ts',
  line: 20,
  character: 10,
  newName: 'newSymbolName'
});
```

#### Custom Language Servers
```javascript
// Use a custom language server
const response = await useMCPTool('lsp', 'lsp_start_server', {
  language: 'custom',
  workspaceUri: 'file:///workspace',
  serverCommand: '/path/to/custom-lsp',
  serverArgs: ['--stdio', '--log-level=info']
});
```

## Best Practices

### 1. Server Lifecycle Management
- Start servers lazily when needed
- Stop servers when no longer in use
- Reuse servers for the same workspace

### 2. Document Synchronization
- Always open documents before requesting features
- Keep document content synchronized with edits
- Close documents when done

### 3. Error Handling
```javascript
try {
  const result = await useMCPTool('lsp', 'lsp_get_completions', params);
  if (result.isError) {
    console.error('LSP error:', result.content[0].text);
  }
} catch (error) {
  console.error('MCP communication error:', error);
}
```

### 4. Performance Optimization
- Batch operations when possible
- Cache server IDs for reuse
- Limit concurrent language servers

## Example: AI Code Assistant Integration

```javascript
class AICodeAssistant {
  constructor(mcpClient) {
    this.mcp = mcpClient;
    this.servers = new Map();
  }

  async analyzeCode(filePath, content) {
    const language = this.detectLanguage(filePath);
    const serverId = await this.ensureServer(language, path.dirname(filePath));
    
    // Open document
    await this.mcp.useTool('lsp', 'lsp_open_document', {
      serverId,
      fileUri: `file://${filePath}`,
      content,
      languageId: language
    });

    // Get diagnostics
    const diagnostics = await this.mcp.useTool('lsp', 'lsp_get_diagnostics', {
      serverId,
      fileUri: `file://${filePath}`
    });

    // Get symbols for understanding structure
    const symbols = await this.mcp.useTool('lsp', 'lsp_get_symbols', {
      serverId,
      fileUri: `file://${filePath}`
    });

    return {
      diagnostics: JSON.parse(diagnostics.content[0].text),
      symbols: JSON.parse(symbols.content[0].text)
    };
  }

  async getContextualHelp(filePath, content, line, character) {
    const language = this.detectLanguage(filePath);
    const serverId = await this.ensureServer(language, path.dirname(filePath));
    
    // Ensure document is open and updated
    await this.mcp.useTool('lsp', 'lsp_update_document', {
      serverId,
      fileUri: `file://${filePath}`,
      content
    });

    // Get hover information
    const hover = await this.mcp.useTool('lsp', 'lsp_get_hover', {
      serverId,
      fileUri: `file://${filePath}`,
      line,
      character
    });

    // Get completions
    const completions = await this.mcp.useTool('lsp', 'lsp_get_completions', {
      serverId,
      fileUri: `file://${filePath}`,
      line,
      character
    });

    return {
      hover: JSON.parse(hover.content[0].text),
      completions: JSON.parse(completions.content[0].text)
    };
  }

  async ensureServer(language, workspace) {
    const key = `${language}:${workspace}`;
    
    if (!this.servers.has(key)) {
      const result = await this.mcp.useTool('lsp', 'lsp_start_server', {
        language,
        workspaceUri: `file://${workspace}`
      });
      
      const serverId = JSON.parse(result.content[0].text).serverId;
      this.servers.set(key, serverId);
    }
    
    return this.servers.get(key);
  }

  detectLanguage(filePath) {
    const ext = path.extname(filePath);
    const langMap = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.py': 'python',
      '.rs': 'rust',
      '.go': 'go',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c'
    };
    return langMap[ext] || 'plaintext';
  }
}
```

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check if the language server is installed
   - Verify the workspace URI is valid
   - Check server logs for errors

2. **No completions/features**
   - Ensure document is opened first
   - Verify the file URI matches exactly
   - Check if the language server supports the feature

3. **Performance issues**
   - Limit concurrent servers
   - Close unused documents
   - Consider server pooling

### Debug Mode

Enable debug logging by setting environment variables:

```json
{
  "mcpServers": {
    "lsp": {
      "command": "node",
      "args": ["/path/to/lsp-mcp-server/build/index.js"],
      "env": {
        "DEBUG": "lsp:*"
      }
    }
  }
}
```

## Contributing

We welcome contributions! Areas of interest:
- Additional language server configurations
- Performance optimizations
- Enhanced error handling
- Additional LSP features
- Documentation improvements

See our [GitHub repository](https://github.com/your-org/lsp-mcp-server) for more details.