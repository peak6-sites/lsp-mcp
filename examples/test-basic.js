#!/usr/bin/env node

/**
 * Basic test for LSP MCP Server - tests server functionality without language servers
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

class BasicMCPTest {
  constructor() {
    this.process = null;
    this.rl = null;
    this.messageId = 1;
  }

  async start() {
    console.log('Starting LSP MCP Server...');
    
    this.process = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    this.rl = createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity
    });

    let responseReceived = false;

    this.rl.on('line', (line) => {
      if (line.trim()) {
        console.log('Server response:', line);
        responseReceived = true;
      }
    });

    this.process.stderr.on('data', (data) => {
      console.log('Server log:', data.toString().trim());
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test listing tools
    console.log('\nTesting tools/list request...');
    const request = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/list',
      params: {}
    };

    this.process.stdin.write(JSON.stringify(request) + '\n');

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (responseReceived) {
      console.log('\n✅ Server is responding to requests!');
    } else {
      console.log('\n❌ No response received from server');
    }

    // Test listing servers (should return empty list)
    console.log('\nTesting lsp_list_servers tool...');
    const listRequest = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/call',
      params: {
        name: 'lsp_list_servers',
        arguments: {}
      }
    };

    this.process.stdin.write(JSON.stringify(listRequest) + '\n');

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Clean up
    this.process.kill();
    console.log('\nTest completed!');
  }
}

// Run the test
const test = new BasicMCPTest();
test.start().catch(console.error);