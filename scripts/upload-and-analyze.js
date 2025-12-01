#!/usr/bin/env node
/**
 * Script to upload audio file to R2 and analyze via MCP Server with Pow3r Pass
 * 
 * Usage:
 *   POW3R_PASS_TOKEN=your_token node scripts/upload-and-analyze.js [audio-file]
 * 
 * Example:
 *   POW3R_PASS_TOKEN=your_token node scripts/upload-and-analyze.js docs/No\ Its\ Not.mp3
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const POW3R_PASS_TOKEN = process.env.POW3R_PASS_TOKEN;
const MCP_ENDPOINT = process.env.ESSENTIA_MCP_ENDPOINT || 
  'https://essentia-audio-analysis.contact-7d8.workers.dev';
const WORKER_URL = process.env.ESSENTIA_WORKER_URL || 
  'https://essentia-audio-analysis.contact-7d8.workers.dev';

if (!POW3R_PASS_TOKEN) {
  console.error('Error: POW3R_PASS_TOKEN environment variable is required');
  console.error('Get your token from config.superbots.link');
  process.exit(1);
}

const audioFile = process.argv[2] || join(__dirname, '../docs/No Its Not.mp3');
const bucketName = 'essentiajs';
const fileName = basename(audioFile);
const objectKey = `input/${fileName}`;

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

async function main() {
  try {
    console.log('🔍 Essentia Audio Analysis via MCP Server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Audio file: ${audioFile}`);
    console.log(`MCP Endpoint: ${MCP_ENDPOINT}`);
    console.log('');

    // Step 1: Upload to R2
    console.log('📤 Uploading audio file to R2...');
    try {
      execSync(`npx wrangler r2 object put ${bucketName}/${objectKey} --file="${audioFile}"`, {
        stdio: 'inherit',
        cwd: join(__dirname, '..')
      });
      console.log('✓ File uploaded to R2');
    } catch (error) {
      console.error('Failed to upload file:', error.message);
      process.exit(1);
    }

    // Step 2: Get file URL
    const fileUrl = `${WORKER_URL}/files/${objectKey}`;
    console.log(`✓ File URL: ${fileUrl}`);
    console.log('');

    // Step 3: Analyze via MCP
    console.log('🎵 Analyzing audio file via MCP Server...');
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

