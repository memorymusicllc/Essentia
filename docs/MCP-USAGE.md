# MCP Server Usage Guide

## Overview

The Essentia Audio Analysis Service provides a **Model Context Protocol (MCP) Server** interface for AI agents and automated workflows. All interactions should use the MCP server with Pow3r Pass authentication - **do not call REST APIs directly**.

## Architecture

- **MCP Server**: Cloudflare Edge-based MCP protocol implementation
- **Pow3r Pass**: Centralized authentication and authorization
- **Processing**: All analysis runs on Cloudflare Edge for sub-10s response times
- **Results**: Returned via MCP protocol responses

## Authentication

### Pow3r Pass Token

All MCP requests require Pow3r Pass authentication:

```bash
# Get your Pow3r Pass token from config.superbots.link
export POW3R_PASS_TOKEN="your_pow3r_pass_token"
```

### Required Scopes

| Scope | Description | Required For |
|-------|-------------|--------------|
| `audio:analyze` | Analyze audio files | `analyze_audio` tool |
| `beats:extract` | Extract beat markers | `extract_beats` tool |
| `sections:detect` | Detect song sections | `detect_sections` tool |
| `psychology:analyze` | Psychological analysis | `analyze_psychology` tool |
| `metadata:read` | Read analysis results | `get_metadata` tool |

## MCP Endpoint

```
https://essentia-audio-analysis.contact-7d8.workers.dev
```

## MCP Protocol

### Headers

All MCP requests must include:

```
Content-Type: application/json
MCP-Protocol-Version: 2024-11-05
Authorization: Bearer <pow3r_pass_token>
```

### Request Format

MCP uses JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "analyze_audio",
    "arguments": {
      "fileUrl": "https://example.com/audio.mp3",
      "includeMetadata": true
    }
  }
}
```

## Available Tools

### 1. analyze_audio

Performs comprehensive audio analysis including all features, beat markers, sections, and metadata.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "analyze_audio",
    "arguments": {
      "fileUrl": "https://example.com/audio.mp3",
      "includeMetadata": true
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Audio analysis completed successfully. File ID: abc123"
      },
      {
        "type": "text",
        "text": "Results available at: https://..."
      }
    ]
  }
}
```

### 2. extract_beats

Extracts beat positions and tempo from audio file.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "extract_beats",
    "arguments": {
      "fileUrl": "https://example.com/audio.mp3"
    }
  }
}
```

### 3. detect_sections

Detects song sections (verse, chorus, bridge, etc.).

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "detect_sections",
    "arguments": {
      "fileUrl": "https://example.com/audio.mp3"
    }
  }
}
```

### 4. analyze_psychology

Extracts psychological descriptors (valence, arousal, emotional trajectory).

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "analyze_psychology",
    "arguments": {
      "fileUrl": "https://example.com/audio.mp3"
    }
  }
}
```

### 5. get_metadata

Retrieves stored analysis metadata for a processed file.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "get_metadata",
    "arguments": {
      "fileId": "abc123",
      "metadataType": "all"
    }
  }
}
```

## Listing Tools

To discover available tools:

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "analyze_audio",
        "description": "Analyze audio file from URL...",
        "inputSchema": {...}
      },
      ...
    ]
  }
}
```

## Listing Resources

To discover available resources:

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list"
}
```

## Example Usage

### Using cURL

```bash
# Set your Pow3r Pass token
export POW3R_PASS_TOKEN="your_token"

# List available tools
curl -X POST https://essentia-audio-analysis.contact-7d8.workers.dev \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2024-11-05" \
  -H "Authorization: Bearer $POW3R_PASS_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# Analyze audio file
curl -X POST https://essentia-audio-analysis.contact-7d8.workers.dev \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2024-11-05" \
  -H "Authorization: Bearer $POW3R_PASS_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "analyze_audio",
      "arguments": {
        "fileUrl": "https://example.com/audio.mp3",
        "includeMetadata": true
      }
    }
  }'
```

### Using JavaScript

```javascript
const POW3R_PASS_TOKEN = process.env.POW3R_PASS_TOKEN;
const MCP_ENDPOINT = 'https://essentia-audio-analysis.contact-7d8.workers.dev';

async function callMCPTool(toolName, arguments) {
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
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: arguments
      }
    })
  });

  return await response.json();
}

// Analyze audio
const result = await callMCPTool('analyze_audio', {
  fileUrl: 'https://example.com/audio.mp3',
  includeMetadata: true
});

console.log(result);
```

### Using Python

```python
import os
import requests
import json

POW3R_PASS_TOKEN = os.environ.get('POW3R_PASS_TOKEN')
MCP_ENDPOINT = 'https://essentia-audio-analysis.contact-7d8.workers.dev'

def call_mcp_tool(tool_name, arguments):
    response = requests.post(
        MCP_ENDPOINT,
        headers={
            'Content-Type': 'application/json',
            'MCP-Protocol-Version': '2024-11-05',
            'Authorization': f'Bearer {POW3R_PASS_TOKEN}'
        },
        json={
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'tools/call',
            'params': {
                'name': tool_name,
                'arguments': arguments
            }
        }
    )
    return response.json()

# Analyze audio
result = call_mcp_tool('analyze_audio', {
    'fileUrl': 'https://example.com/audio.mp3',
    'includeMetadata': True
})

print(json.dumps(result, indent=2))
```

## Error Handling

MCP errors follow JSON-RPC 2.0 error format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": "Error details"
  }
}
```

Common error codes:
- `-32600`: Invalid Request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `-32000`: Server error (authentication, etc.)

## Best Practices

1. **Always use MCP**: Do not call REST APIs directly
2. **Use Pow3r Pass**: All requests must include Pow3r Pass token
3. **Handle errors**: Check for `error` field in responses
4. **Use appropriate scopes**: Ensure your token has required scopes
5. **Process on Edge**: All analysis runs on Cloudflare Edge automatically
6. **Return via MCP**: Results are returned through MCP protocol responses

## Integration with Pow3r Workflow Orchestrator

The MCP server integrates seamlessly with Pow3r Workflow Orchestrator:

```yaml
steps:
  - name: analyze_audio
    tool: essentia-audio-analysis
    method: tools/call
    params:
      name: analyze_audio
      arguments:
        fileUrl: "{{input.fileUrl}}"
        includeMetadata: true
    authentication:
      pow3rPass: true
      requiredScopes: ["audio:analyze"]
```

## Support

For issues or questions:
- Check Pow3r Pass token validity
- Verify required scopes are granted
- Review MCP protocol version compatibility
- Check Cloudflare Worker logs for detailed errors

