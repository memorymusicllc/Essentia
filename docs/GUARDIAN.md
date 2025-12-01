# Guardian - Essentia Audio Analysis Service

## Overview

The Essentia Audio Analysis Service is a **Cloudflare Edge-based** audio analysis platform that processes audio files using Essentia.js WASM and returns results via the **Model Context Protocol (MCP) Server** with **Pow3r Pass** authentication.

## Architecture Principles

### ✅ DO

1. **Use MCP Server**: All interactions must use the MCP Server interface
2. **Pow3r Pass Authentication**: All requests require Pow3r Pass token
3. **Process on Edge**: All analysis runs on Cloudflare Edge automatically
4. **Return via MCP**: Results are returned through MCP protocol responses
5. **Use Appropriate Scopes**: Ensure Pow3r Pass token has required scopes

### ❌ DON'T

1. **Do NOT call REST APIs directly**: The REST API is deprecated
2. **Do NOT bypass authentication**: All requests require Pow3r Pass
3. **Do NOT use test mode in production**: Test mode is for development only
4. **Do NOT hardcode credentials**: Use environment variables for tokens

## Service Endpoints

### MCP Server (Primary)

- **Endpoint**: `https://essentia-audio-analysis.contact-7d8.workers.dev`
- **Protocol**: MCP (Model Context Protocol) over HTTP
- **Authentication**: Pow3r Pass Bearer token
- **Version**: `2024-11-05`

### File Serving (Supporting)

- **Endpoint**: `https://essentia-audio-analysis.contact-7d8.workers.dev/files/{key}`
- **Purpose**: Serve uploaded audio files from R2
- **Access**: Public (for testing), should be secured in production

## Authentication

### Pow3r Pass Token

Get your token from `config.superbots.link`:

```bash
export POW3R_PASS_TOKEN="your_pow3r_pass_token"
```

### Required Scopes

| Scope | Tool | Description |
|-------|------|-------------|
| `audio:analyze` | `analyze_audio` | Full audio analysis |
| `beats:extract` | `extract_beats` | Beat marker extraction |
| `sections:detect` | `detect_sections` | Section detection |
| `psychology:analyze` | `analyze_psychology` | Psychological analysis |
| `metadata:read` | `get_metadata` | Read stored results |

## MCP Tools

### analyze_audio

Performs comprehensive audio analysis including all features, beat markers, sections, and metadata.

**Required Scope**: `audio:analyze`

**Arguments**:
- `fileUrl` (string, required): HTTPS URL to audio file
- `includeMetadata` (boolean, optional): Include enhanced metadata (default: true)

### extract_beats

Extracts beat positions and tempo from audio file.

**Required Scope**: `beats:extract`

**Arguments**:
- `fileUrl` (string, required): HTTPS URL to audio file

### detect_sections

Detects song sections (verse, chorus, bridge, etc.).

**Required Scope**: `sections:detect`

**Arguments**:
- `fileUrl` (string, required): HTTPS URL to audio file

### analyze_psychology

Extracts psychological descriptors (valence, arousal, emotional trajectory).

**Required Scope**: `psychology:analyze`

**Arguments**:
- `fileUrl` (string, required): HTTPS URL to audio file

### get_metadata

Retrieves stored analysis metadata for a processed file.

**Required Scope**: `metadata:read`

**Arguments**:
- `fileId` (string, required): File ID from previous analysis
- `metadataType` (string, optional): Type of metadata (`song`, `sections`, `loops`, `beatMarkers`, `all`)

## Usage Examples

### Upload and Analyze

```bash
# Upload file to R2 and analyze via MCP
POW3R_PASS_TOKEN=your_token node scripts/upload-and-analyze.js docs/audio.mp3
```

### Analyze Existing URL

```bash
# Analyze audio file from URL via MCP
POW3R_PASS_TOKEN=your_token node scripts/analyze-via-mcp.js https://example.com/audio.mp3
```

### Direct MCP Call

```bash
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

## Processing Details

### Edge Processing

- All analysis runs on **Cloudflare Edge** for sub-10s response times
- WASM module is pre-initialized for optimal performance
- Frame sampling is used to balance quality and speed

### Frame Sampling

- **Default**: Every 5th frame (`FRAME_SAMPLE_RATE=5`)
- **Full Processing**: Set to `1` for complete analysis
- **Faster Processing**: Increase to `10-20` for quicker results

### Storage

- Results stored in **Cloudflare R2**
- Accessible via MCP resources or public URLs
- File IDs are UUIDs for unique identification

## Error Handling

MCP errors follow JSON-RPC 2.0 format:

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

## Monitoring

- **Cloudflare Workers Dashboard**: Monitor worker performance and errors
- **R2 Dashboard**: Monitor storage usage and access patterns
- **Pow3r Pass Dashboard**: Monitor authentication and scope usage

## Security

1. **Authentication**: All requests require Pow3r Pass token
2. **Scope Validation**: Tools validate required scopes
3. **Rate Limiting**: Implemented via Pow3r Pass
4. **Edge Security**: Cloudflare Workers provide DDoS protection

## Support

For issues or questions:
- Check Pow3r Pass token validity
- Verify required scopes are granted
- Review MCP protocol version compatibility
- Check Cloudflare Worker logs for detailed errors
- See [MCP Usage Guide](./MCP-USAGE.md) for detailed documentation

