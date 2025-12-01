#!/usr/bin/env node
/**
 * Analyze audio file via MCP Server with Pow3r Pass
 * 
 * Usage:
 *   POW3R_PASS_TOKEN=your_token node scripts/analyze-via-mcp.js <fileUrl>
 * 
 * Example:
 *   POW3R_PASS_TOKEN=your_token node scripts/analyze-via-mcp.js https://example.com/audio.mp3
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const POW3R_PASS_TOKEN = process.env.POW3R_PASS_TOKEN;
const MCP_ENDPOINT = process.env.ESSENTIA_MCP_ENDPOINT || 
  'https://essentia-audio-analysis.contact-7d8.workers.dev';

if (!POW3R_PASS_TOKEN) {
  console.error('Error: POW3R_PASS_TOKEN environment variable is required');
  console.error('Get your token from config.superbots.link');
  process.exit(1);
}

const fileUrl = process.argv[2];
if (!fileUrl) {
  console.error('Error: File URL is required');
  console.error('Usage: POW3R_PASS_TOKEN=token node scripts/analyze-via-mcp.js <fileUrl>');
  process.exit(1);
}

/**
 * Call MCP tool
 */
async function callMCPTool(toolName, toolArguments) {
  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2024-11-05',
      'Authorization': `Bearer ${POW3R_PASS_TOKEN}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: toolArguments
      }
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`MCP Error: ${data.error.message} (code: ${data.error.code})`);
  }

  return data.result;
}

/**
 * List available tools
 */
async function listTools() {
  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2024-11-05',
      'Authorization': `Bearer ${POW3R_PASS_TOKEN}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    })
  });

  const data = await response.json();
  return data.result?.tools || [];
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔍 Essentia Audio Analysis via MCP Server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Endpoint: ${MCP_ENDPOINT}`);
    console.log(`File URL: ${fileUrl}`);
    console.log('');

    // List available tools
    console.log('📋 Listing available tools...');
    const tools = await listTools();
    console.log(`✓ Found ${tools.length} tools`);
    console.log('');

    // Analyze audio
    console.log('🎵 Analyzing audio file...');
    const result = await callMCPTool('analyze_audio', {
      fileUrl: fileUrl,
      includeMetadata: true
    });

    console.log('✓ Analysis completed successfully');
    console.log('');
    console.log('📊 Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (result.content) {
      result.content.forEach((item, index) => {
        console.log(`${index + 1}. ${item.text}`);
      });
    }

    console.log('');
    console.log('✅ Done!');

  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

