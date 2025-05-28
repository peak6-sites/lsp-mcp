#!/usr/bin/env node

/**
 * Test script for LSP MCP Server
 * This demonstrates how an AI code editor would interact with the LSP MCP server
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

class MCPClient {
  constructor(serverPath) {
    this.serverPath = serverPath;
    this.process = null;
    this.rl = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
  }

  async start() {
    this.process = spawn('node', [this.serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.rl = createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity
    });

    this.rl.on('line', (line) => {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.handleMessage(message);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      }
    });

    this.process.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  handleMessage(message) {
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id);
      this.pendingRequests.delete(message.id);
      
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    }
  }

  async sendRequest(method, params) {
    const id = this.requestId++;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async stop() {
    if (this.process) {
      this.process.kill();
    }
  }
}

async function runTests() {
  console.log('Starting LSP MCP Server tests...\n');
  
  const client = new MCPClient('./build/index.js');
  await client.start();

  try {
    // List available tools
    console.log('1. Listing available tools...');
    const tools = await client.sendRequest('tools/list', {});
    console.log(`Found ${tools.tools.length} tools\n`);

    // Start a TypeScript language server
    console.log('2. Starting TypeScript language server...');
    const startResult = await client.sendRequest('tools/call', {
      name: 'lsp_start_server',
      arguments: {
        language: 'typescript',
        workspaceUri: 'file:///tmp/test-workspace'
      }
    });
    
    const serverId = JSON.parse(startResult.content[0].text).serverId;
    console.log(`Server started with ID: ${serverId}\n`);

    // Open a document
    console.log('3. Opening a TypeScript document...');
    const testCode = `
interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}

const john: User = {
  name: "John",
  age: 30
};

console.log(greet(john));
`;

    await client.sendRequest('tools/call', {
      name: 'lsp_open_document',
      arguments: {
        serverId,
        fileUri: 'file:///tmp/test-workspace/test.ts',
        content: testCode,
        languageId: 'typescript'
      }
    });
    console.log('Document opened\n');

    // Get hover information
    console.log('4. Getting hover info for "User" interface...');
    const hoverResult = await client.sendRequest('tools/call', {
      name: 'lsp_get_hover',
      arguments: {
        serverId,
        fileUri: 'file:///tmp/test-workspace/test.ts',
        line: 6,  // "user: User" parameter
        character: 20
      }
    });
    console.log('Hover result:', hoverResult.content[0].text, '\n');

    // Get completions
    console.log('5. Getting completions after "john."...');
    const completionResult = await client.sendRequest('tools/call', {
      name: 'lsp_get_completions',
      arguments: {
        serverId,
        fileUri: 'file:///tmp/test-workspace/test.ts',
        line: 15,
        character: 23  // After "greet(john"
      }
    });
    console.log('Completion result:', completionResult.content[0].text, '\n');

    // List active servers
    console.log('6. Listing active servers...');
    const serversResult = await client.sendRequest('tools/call', {
      name: 'lsp_list_servers',
      arguments: {}
    });
    console.log('Active servers:', serversResult.content[0].text, '\n');

    // Stop the server
    console.log('7. Stopping the language server...');
    await client.sendRequest('tools/call', {
      name: 'lsp_stop_server',
      arguments: { serverId }
    });
    console.log('Server stopped\n');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await client.stop();
    console.log('Tests completed!');
  }
}

// Run the tests
runTests().catch(console.error);