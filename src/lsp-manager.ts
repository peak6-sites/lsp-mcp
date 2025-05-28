import {
  createConnection,
  Connection,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  CompletionParams,
  CompletionList,
  Hover,
  Location,
  ReferenceParams,
  RenameParams,
  WorkspaceEdit,
  DocumentFormattingParams,
  TextEdit,
  DocumentSymbolParams,
  SymbolInformation,
  Diagnostic,
  DidOpenTextDocumentParams,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as child_process from 'child_process';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as net from 'net';
import * as rpc from 'vscode-jsonrpc/node.js';

interface LSPServerInfo {
  id: string;
  language: string;
  workspaceUri: string;
  process: child_process.ChildProcess;
  connection: rpc.MessageConnection;
  documents: Map<string, TextDocument>;
  initialized: boolean;
}

export class LSPManager {
  private servers: Map<string, LSPServerInfo> = new Map();
  private languageServerCommands: Map<string, { command: string; args: string[] }> = new Map([
    ['typescript', { command: 'typescript-language-server', args: ['--stdio'] }],
    ['python', { command: 'pylsp', args: [] }],
    ['rust', { command: 'rust-analyzer', args: [] }],
    ['go', { command: 'gopls', args: [] }],
    ['java', { command: 'jdtls', args: [] }],
    ['cpp', { command: 'clangd', args: [] }],
  ]);

  async startServer(
    language: string,
    workspaceUri: string,
    customCommand?: string,
    customArgs?: string[]
  ): Promise<string> {
    const serverId = uuidv4();
    
    let command: string;
    let args: string[];
    
    if (customCommand) {
      command = customCommand;
      args = customArgs || [];
    } else {
      const serverConfig = this.languageServerCommands.get(language);
      if (!serverConfig) {
        throw new Error(`No language server configured for ${language}`);
      }
      command = serverConfig.command;
      args = serverConfig.args;
    }

    const serverProcess = child_process.spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    serverProcess.on('error', (err) => {
      console.error(`Language server ${serverId} error:`, err);
      this.servers.delete(serverId);
    });

    serverProcess.on('exit', (code) => {
      console.error(`Language server ${serverId} exited with code ${code}`);
      this.servers.delete(serverId);
    });

    // Create JSON-RPC connection
    const connection = rpc.createMessageConnection(
      new rpc.StreamMessageReader(serverProcess.stdout),
      new rpc.StreamMessageWriter(serverProcess.stdin)
    );

    // Start listening
    connection.listen();

    const serverInfo: LSPServerInfo = {
      id: serverId,
      language,
      workspaceUri,
      process: serverProcess,
      connection,
      documents: new Map(),
      initialized: false,
    };

    this.servers.set(serverId, serverInfo);

    // Initialize the server
    try {
      const initParams: InitializeParams = {
        processId: process.pid,
        rootUri: workspaceUri,
        capabilities: {
          textDocument: {
            synchronization: {
              dynamicRegistration: false,
              willSave: false,
              willSaveWaitUntil: false,
              didSave: false
            },
            completion: {
              dynamicRegistration: false,
              completionItem: {
                snippetSupport: true,
                commitCharactersSupport: false,
                documentationFormat: ['plaintext', 'markdown'],
                deprecatedSupport: false,
                preselectSupport: false
              },
              contextSupport: false
            },
            hover: {
              dynamicRegistration: false,
              contentFormat: ['plaintext', 'markdown']
            },
            signatureHelp: {
              dynamicRegistration: false
            },
            references: {
              dynamicRegistration: false
            },
            documentHighlight: {
              dynamicRegistration: false
            },
            documentSymbol: {
              dynamicRegistration: false,
              hierarchicalDocumentSymbolSupport: false
            },
            formatting: {
              dynamicRegistration: false
            },
            rangeFormatting: {
              dynamicRegistration: false
            },
            onTypeFormatting: {
              dynamicRegistration: false
            },
            definition: {
              dynamicRegistration: false
            },
            codeAction: {
              dynamicRegistration: false
            },
            codeLens: {
              dynamicRegistration: false
            },
            documentLink: {
              dynamicRegistration: false
            },
            rename: {
              dynamicRegistration: false
            }
          },
          workspace: {
            applyEdit: false,
            workspaceEdit: {
              documentChanges: false
            },
            didChangeConfiguration: {
              dynamicRegistration: false
            },
            didChangeWatchedFiles: {
              dynamicRegistration: false
            },
            symbol: {
              dynamicRegistration: false
            },
            executeCommand: {
              dynamicRegistration: false
            },
            workspaceFolders: false,
            configuration: false
          }
        },
        workspaceFolders: [
          {
            uri: workspaceUri,
            name: path.basename(workspaceUri),
          },
        ],
      };

      await connection.sendRequest('initialize', initParams);
      await connection.sendNotification('initialized', {});
      serverInfo.initialized = true;
    } catch (err) {
      console.error('Failed to initialize language server:', err);
      this.stopServer(serverId);
      throw err;
    }

    return serverId;
  }

  async stopServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    // Send shutdown request
    try {
      await server.connection.sendRequest('shutdown', null);
      await server.connection.sendNotification('exit', null);
    } catch (err) {
      console.error('Error during server shutdown:', err);
    }

    server.connection.dispose();
    server.process.kill();
    this.servers.delete(serverId);
  }

  async stopAllServers(): Promise<void> {
    const stopPromises = Array.from(this.servers.keys()).map(id => 
      this.stopServer(id).catch(err => console.error(`Error stopping server ${id}:`, err))
    );
    await Promise.all(stopPromises);
  }

  async getDiagnostics(serverId: string, fileUri: string): Promise<Diagnostic[]> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    // In a real implementation, we would track diagnostics sent by the server
    // For now, return empty array
    return [];
  }

  async getCompletions(
    serverId: string,
    fileUri: string,
    line: number,
    character: number
  ): Promise<CompletionList | null> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const params: CompletionParams = {
      textDocument: { uri: fileUri },
      position: { line, character },
    };

    try {
      const result = await server.connection.sendRequest('textDocument/completion', params);
      return result as CompletionList;
    } catch (err) {
      console.error('Error getting completions:', err);
      return null;
    }
  }

  async getHover(
    serverId: string,
    fileUri: string,
    line: number,
    character: number
  ): Promise<Hover | null> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const params = {
      textDocument: { uri: fileUri },
      position: { line, character },
    };

    try {
      const result = await server.connection.sendRequest('textDocument/hover', params);
      return result as Hover;
    } catch (err) {
      console.error('Error getting hover:', err);
      return null;
    }
  }

  async goToDefinition(
    serverId: string,
    fileUri: string,
    line: number,
    character: number
  ): Promise<Location | Location[] | null> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const params = {
      textDocument: { uri: fileUri },
      position: { line, character },
    };

    try {
      const result = await server.connection.sendRequest('textDocument/definition', params);
      return result as Location | Location[];
    } catch (err) {
      console.error('Error going to definition:', err);
      return null;
    }
  }

  async findReferences(
    serverId: string,
    fileUri: string,
    line: number,
    character: number,
    includeDeclaration: boolean
  ): Promise<Location[] | null> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const params: ReferenceParams = {
      textDocument: { uri: fileUri },
      position: { line, character },
      context: { includeDeclaration },
    };

    try {
      const result = await server.connection.sendRequest('textDocument/references', params);
      return result as Location[];
    } catch (err) {
      console.error('Error finding references:', err);
      return null;
    }
  }

  async renameSymbol(
    serverId: string,
    fileUri: string,
    line: number,
    character: number,
    newName: string
  ): Promise<WorkspaceEdit | null> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const params: RenameParams = {
      textDocument: { uri: fileUri },
      position: { line, character },
      newName,
    };

    try {
      const result = await server.connection.sendRequest('textDocument/rename', params);
      return result as WorkspaceEdit;
    } catch (err) {
      console.error('Error renaming symbol:', err);
      return null;
    }
  }

  async formatDocument(
    serverId: string,
    fileUri: string
  ): Promise<TextEdit[] | null> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const params: DocumentFormattingParams = {
      textDocument: { uri: fileUri },
      options: {
        tabSize: 2,
        insertSpaces: true,
      },
    };

    try {
      const result = await server.connection.sendRequest('textDocument/formatting', params);
      return result as TextEdit[];
    } catch (err) {
      console.error('Error formatting document:', err);
      return null;
    }
  }

  async getDocumentSymbols(
    serverId: string,
    fileUri: string
  ): Promise<SymbolInformation[] | null> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const params: DocumentSymbolParams = {
      textDocument: { uri: fileUri },
    };

    try {
      const result = await server.connection.sendRequest('textDocument/documentSymbol', params);
      return result as SymbolInformation[];
    } catch (err) {
      console.error('Error getting document symbols:', err);
      return null;
    }
  }

  listServers(): Array<{
    id: string;
    language: string;
    workspaceUri: string;
    initialized: boolean;
  }> {
    return Array.from(this.servers.values()).map(server => ({
      id: server.id,
      language: server.language,
      workspaceUri: server.workspaceUri,
      initialized: server.initialized,
    }));
  }

  async openDocument(
    serverId: string,
    fileUri: string,
    content: string,
    languageId: string
  ): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const document = TextDocument.create(fileUri, languageId, 1, content);
    server.documents.set(fileUri, document);

    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri: fileUri,
        languageId,
        version: 1,
        text: content,
      },
    };

    await server.connection.sendNotification('textDocument/didOpen', params);
  }

  async updateDocument(
    serverId: string,
    fileUri: string,
    content: string
  ): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const document = server.documents.get(fileUri);
    if (!document) {
      throw new Error(`Document ${fileUri} not open`);
    }

    const newVersion = document.version + 1;
    const newDocument = TextDocument.create(
      fileUri,
      document.languageId,
      newVersion,
      content
    );
    server.documents.set(fileUri, newDocument);

    const params: DidChangeTextDocumentParams = {
      textDocument: {
        uri: fileUri,
        version: newVersion,
      },
      contentChanges: [{ text: content }],
    };

    await server.connection.sendNotification('textDocument/didChange', params);
  }

  async closeDocument(serverId: string, fileUri: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const document = server.documents.get(fileUri);
    if (!document) {
      throw new Error(`Document ${fileUri} not open`);
    }

    server.documents.delete(fileUri);

    const params: DidCloseTextDocumentParams = {
      textDocument: { uri: fileUri },
    };

    await server.connection.sendNotification('textDocument/didClose', params);
  }
}