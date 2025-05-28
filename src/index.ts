#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { LSPManager } from './lsp-manager.js';
import { FileSystemManager } from './filesystem-manager.js';

class LSPMCPServer {
  private server: Server;
  private lspManager: LSPManager;
  private fsManager: FileSystemManager;

  constructor() {
    this.server = new Server(
      {
        name: 'lsp-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.lspManager = new LSPManager();
    this.fsManager = new FileSystemManager();

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.lspManager.stopAllServers();
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'lsp_start_server',
          description: 'Start a language server for a specific language',
          inputSchema: {
            type: 'object',
            properties: {
              language: {
                type: 'string',
                description: 'Programming language (e.g., typescript, python, rust)',
                enum: ['typescript', 'python', 'rust', 'go', 'java', 'cpp']
              },
              workspaceUri: {
                type: 'string',
                description: 'Workspace URI (file:// URI)'
              },
              serverCommand: {
                type: 'string',
                description: 'Optional custom server command'
              },
              serverArgs: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional server arguments'
              }
            },
            required: ['language', 'workspaceUri']
          }
        },
        {
          name: 'lsp_stop_server',
          description: 'Stop a running language server',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID returned from lsp_start_server'
              }
            },
            required: ['serverId']
          }
        },
        {
          name: 'lsp_get_diagnostics',
          description: 'Get diagnostics (errors, warnings) for a file',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID'
              },
              fileUri: {
                type: 'string',
                description: 'File URI to get diagnostics for'
              }
            },
            required: ['serverId', 'fileUri']
          }
        },
        {
          name: 'lsp_get_completions',
          description: 'Get code completions at a specific position',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID'
              },
              fileUri: {
                type: 'string',
                description: 'File URI'
              },
              line: {
                type: 'number',
                description: 'Line number (0-based)'
              },
              character: {
                type: 'number',
                description: 'Character position (0-based)'
              }
            },
            required: ['serverId', 'fileUri', 'line', 'character']
          }
        },
        {
          name: 'lsp_get_hover',
          description: 'Get hover information at a specific position',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID'
              },
              fileUri: {
                type: 'string',
                description: 'File URI'
              },
              line: {
                type: 'number',
                description: 'Line number (0-based)'
              },
              character: {
                type: 'number',
                description: 'Character position (0-based)'
              }
            },
            required: ['serverId', 'fileUri', 'line', 'character']
          }
        },
        {
          name: 'lsp_go_to_definition',
          description: 'Find definition location for symbol at position',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID'
              },
              fileUri: {
                type: 'string',
                description: 'File URI'
              },
              line: {
                type: 'number',
                description: 'Line number (0-based)'
              },
              character: {
                type: 'number',
                description: 'Character position (0-based)'
              }
            },
            required: ['serverId', 'fileUri', 'line', 'character']
          }
        },
        {
          name: 'lsp_find_references',
          description: 'Find all references to symbol at position',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID'
              },
              fileUri: {
                type: 'string',
                description: 'File URI'
              },
              line: {
                type: 'number',
                description: 'Line number (0-based)'
              },
              character: {
                type: 'number',
                description: 'Character position (0-based)'
              },
              includeDeclaration: {
                type: 'boolean',
                description: 'Include the declaration in results',
                default: true
              }
            },
            required: ['serverId', 'fileUri', 'line', 'character']
          }
        },
        {
          name: 'lsp_rename_symbol',
          description: 'Rename a symbol across the workspace',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID'
              },
              fileUri: {
                type: 'string',
                description: 'File URI'
              },
              line: {
                type: 'number',
                description: 'Line number (0-based)'
              },
              character: {
                type: 'number',
                description: 'Character position (0-based)'
              },
              newName: {
                type: 'string',
                description: 'New name for the symbol'
              }
            },
            required: ['serverId', 'fileUri', 'line', 'character', 'newName']
          }
        },
        {
          name: 'lsp_format_document',
          description: 'Format an entire document',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID'
              },
              fileUri: {
                type: 'string',
                description: 'File URI to format'
              }
            },
            required: ['serverId', 'fileUri']
          }
        },
        {
          name: 'lsp_get_symbols',
          description: 'Get document symbols (classes, functions, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID'
              },
              fileUri: {
                type: 'string',
                description: 'File URI'
              }
            },
            required: ['serverId', 'fileUri']
          }
        },
        {
          name: 'lsp_list_servers',
          description: 'List all active language servers',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'lsp_open_document',
          description: 'Open a document in the language server',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID'
              },
              fileUri: {
                type: 'string',
                description: 'File URI'
              },
              content: {
                type: 'string',
                description: 'File content'
              },
              languageId: {
                type: 'string',
                description: 'Language ID (e.g., typescript, python)'
              }
            },
            required: ['serverId', 'fileUri', 'content', 'languageId']
          }
        },
        {
          name: 'lsp_update_document',
          description: 'Update document content in the language server',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID'
              },
              fileUri: {
                type: 'string',
                description: 'File URI'
              },
              content: {
                type: 'string',
                description: 'New file content'
              }
            },
            required: ['serverId', 'fileUri', 'content']
          }
        },
        {
          name: 'lsp_close_document',
          description: 'Close a document in the language server',
          inputSchema: {
            type: 'object',
            properties: {
              serverId: {
                type: 'string',
                description: 'Server ID'
              },
              fileUri: {
                type: 'string',
                description: 'File URI'
              }
            },
            required: ['serverId', 'fileUri']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'lsp_start_server':
            return await this.handleStartServer(request.params.arguments);
          case 'lsp_stop_server':
            return await this.handleStopServer(request.params.arguments);
          case 'lsp_get_diagnostics':
            return await this.handleGetDiagnostics(request.params.arguments);
          case 'lsp_get_completions':
            return await this.handleGetCompletions(request.params.arguments);
          case 'lsp_get_hover':
            return await this.handleGetHover(request.params.arguments);
          case 'lsp_go_to_definition':
            return await this.handleGoToDefinition(request.params.arguments);
          case 'lsp_find_references':
            return await this.handleFindReferences(request.params.arguments);
          case 'lsp_rename_symbol':
            return await this.handleRenameSymbol(request.params.arguments);
          case 'lsp_format_document':
            return await this.handleFormatDocument(request.params.arguments);
          case 'lsp_get_symbols':
            return await this.handleGetSymbols(request.params.arguments);
          case 'lsp_list_servers':
            return await this.handleListServers();
          case 'lsp_open_document':
            return await this.handleOpenDocument(request.params.arguments);
          case 'lsp_update_document':
            return await this.handleUpdateDocument(request.params.arguments);
          case 'lsp_close_document':
            return await this.handleCloseDocument(request.params.arguments);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private async handleStartServer(args: any) {
    const serverId = await this.lspManager.startServer(
      args.language,
      args.workspaceUri,
      args.serverCommand,
      args.serverArgs
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            serverId,
            status: 'started',
            language: args.language,
            workspace: args.workspaceUri
          }, null, 2)
        }
      ]
    };
  }

  private async handleStopServer(args: any) {
    await this.lspManager.stopServer(args.serverId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            serverId: args.serverId,
            status: 'stopped'
          }, null, 2)
        }
      ]
    };
  }

  private async handleGetDiagnostics(args: any) {
    const diagnostics = await this.lspManager.getDiagnostics(
      args.serverId,
      args.fileUri
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(diagnostics, null, 2)
        }
      ]
    };
  }

  private async handleGetCompletions(args: any) {
    const completions = await this.lspManager.getCompletions(
      args.serverId,
      args.fileUri,
      args.line,
      args.character
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(completions, null, 2)
        }
      ]
    };
  }

  private async handleGetHover(args: any) {
    const hover = await this.lspManager.getHover(
      args.serverId,
      args.fileUri,
      args.line,
      args.character
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(hover, null, 2)
        }
      ]
    };
  }

  private async handleGoToDefinition(args: any) {
    const definition = await this.lspManager.goToDefinition(
      args.serverId,
      args.fileUri,
      args.line,
      args.character
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(definition, null, 2)
        }
      ]
    };
  }

  private async handleFindReferences(args: any) {
    const references = await this.lspManager.findReferences(
      args.serverId,
      args.fileUri,
      args.line,
      args.character,
      args.includeDeclaration ?? true
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(references, null, 2)
        }
      ]
    };
  }

  private async handleRenameSymbol(args: any) {
    const edits = await this.lspManager.renameSymbol(
      args.serverId,
      args.fileUri,
      args.line,
      args.character,
      args.newName
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(edits, null, 2)
        }
      ]
    };
  }

  private async handleFormatDocument(args: any) {
    const edits = await this.lspManager.formatDocument(
      args.serverId,
      args.fileUri
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(edits, null, 2)
        }
      ]
    };
  }

  private async handleGetSymbols(args: any) {
    const symbols = await this.lspManager.getDocumentSymbols(
      args.serverId,
      args.fileUri
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(symbols, null, 2)
        }
      ]
    };
  }

  private async handleListServers() {
    const servers = this.lspManager.listServers();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(servers, null, 2)
        }
      ]
    };
  }

  private async handleOpenDocument(args: any) {
    await this.lspManager.openDocument(
      args.serverId,
      args.fileUri,
      args.content,
      args.languageId
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'opened',
            fileUri: args.fileUri
          }, null, 2)
        }
      ]
    };
  }

  private async handleUpdateDocument(args: any) {
    await this.lspManager.updateDocument(
      args.serverId,
      args.fileUri,
      args.content
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'updated',
            fileUri: args.fileUri
          }, null, 2)
        }
      ]
    };
  }

  private async handleCloseDocument(args: any) {
    await this.lspManager.closeDocument(
      args.serverId,
      args.fileUri
    );
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'closed',
            fileUri: args.fileUri
          }, null, 2)
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('LSP MCP server running on stdio');
  }
}

const server = new LSPMCPServer();
server.run().catch(console.error);