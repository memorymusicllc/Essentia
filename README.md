# Essentia Audio Analysis Service

A cloud-based audio analysis service that performs comprehensive audio feature extraction using the Essentia.js library. The service accepts audio file URLs, performs extensive audio analysis, and stores the results in Cloudflare R2.

**✨ Now Enhanced with Pow3r Workflow Orchestrator & Pow3r Pass Authentication**

- 🔐 **Pow3r Pass ACL**: Enterprise-grade authentication with granular permissions
- ☁️ **Cloudflare Edge**: Global distribution with sub-10s response times
- 🔄 **Workflow Orchestration**: Complex multi-step audio analysis pipelines
- 🤖 **MCP Server**: Model Context Protocol for AI agent integration
- 🧪 **E2E Testing**: Comprehensive test coverage with automated deployment

**📚 Documentation**:
- [MCP Usage Guide](./docs/MCP-USAGE.md) - Complete guide for using MCP Server
- [Guardian](./docs/GUARDIAN.md) - Service architecture and best practices

## Overview

Essentia is a Cloudflare Edge-based audio analysis service that leverages the Essentia.js library (a JavaScript port of the Essentia audio analysis library) to extract detailed audio features from audio files. The service runs on Cloudflare Workers and provides a **Model Context Protocol (MCP) Server** interface for AI agents and automated workflows.

**⚠️ Important**: All interactions must use the **MCP Server with Pow3r Pass authentication**. Do not call REST APIs directly.

## What It Does

The service performs comprehensive audio analysis including:

- **Spectral Analysis**: FFT, DCT, spectral peaks, rolloff, complexity, and contrast
- **Frequency Band Analysis**: Bark bands, Mel bands, ERB bands
- **Cepstral Analysis**: MFCC (Mel-Frequency Cepstral Coefficients), GFCC (Gammatone-Frequency Cepstral Coefficients)
- **Pitch & Tonal Analysis**: Pitch detection, melody extraction, key detection, scale detection, tuning frequency
- **Rhythm Analysis**: Beat detection, BPM estimation, onset detection, rhythm transform
- **Harmonic Analysis**: HPCP (chroma), chord detection, inharmonicity, dissonance
- **High-Level Descriptors**: Danceability, dynamic complexity, audio segmentation

### Enhanced Features (NEW)

- **Beat Markers & Loop Slicing**: Automatic detection of beat positions and generation of loop points (4, 8, 16 beats)
- **Song Section Detection**: Automatic identification of song sections (verse, chorus, bridge, intro, outro)
- **Songwriting Metadata**:
  - **Story Arcs**: Tension/release patterns and narrative structure analysis
  - **Motifs**: Recurring melodic and harmonic patterns tracked as "characters"
  - **Quotes**: Repeated musical phrases (melodic and harmonic quotes)
  - **Psychological Analysis**: Valence (emotion), arousal (energy), emotional trajectory, and paradigm shifts
- **Hierarchical Metadata**: Structured at three levels:
  - **Song Level**: Overall analysis, story arcs, psychological profile
  - **Section Level**: Per-section metadata (verse, chorus, etc.)
  - **Loop Level**: Beat-aligned loop metadata for slicing and remixing

All analysis results are stored as JSON files in Cloudflare R2 and accessible via MCP resources or public URLs.

## Features

### Core Features

- **Audio File Processing**: Downloads and processes audio files from HTTPS URLs
- **Comprehensive Analysis**: Extracts 30+ different audio features and descriptors
- **Cloud Storage Integration**: Automatically uploads analysis results to Google Cloud Storage
- **RESTful API**: Simple POST endpoint for audio analysis requests
- **Error Handling**: Robust error handling with cleanup of temporary files
- **Scalable**: Designed for Google Cloud Run with auto-scaling capabilities

### Audio Analysis Capabilities

#### Spectral Features
- Fast Fourier Transform (FFT)
- Discrete Cosine Transform (DCT)
- Spectral peaks detection
- Spectral rolloff
- High Frequency Content (HFC)
- Spectral contrast

#### Frequency Bands
- Bark scale bands
- Mel scale bands
- ERB (Equivalent Rectangular Bandwidth) bands

#### Cepstral Features
- MFCC (Mel-Frequency Cepstral Coefficients)
- GFCC (Gammatone-Frequency Cepstral Coefficients)
- LPC (Linear Predictive Coding)

#### Pitch & Tonal
- Pitch salience function
- Predominant pitch/melody extraction
- Musical key detection
- Scale detection
- Tuning frequency extraction

#### Rhythm
- Beat detection (TempoTapDegara algorithm)
- BPM (beats per minute) estimation
- Onset detection
- Rhythm transform
- Beat loudness

#### Harmonic Analysis
- HPCP (Harmonic Pitch Class Profile / Chroma)
- Chord detection
- Inharmonicity analysis
- Dissonance measurement

#### High-Level Descriptors
- Danceability metrics
- Dynamic complexity
- Audio segmentation (zero crossing rate)

#### Enhanced Analysis Features
- **Beat Markers**: Precise beat positions for loop slicing
- **Loop Points**: Automatic generation of 4, 8, and 16-beat loops
- **Section Detection**: Verse, chorus, bridge, intro, outro identification
- **Story Arc Analysis**: Tension/release patterns and narrative structure
- **Motif Extraction**: Recurring patterns tracked throughout the song
- **Quote Detection**: Repeated melodic and harmonic phrases
- **Psychological Descriptors**: Valence, arousal, emotional trajectory
- **Paradigm Shift Detection**: Identification of sudden emotional/musical changes

## How To Use

### ⚠️ Important: Use MCP Server, Not Direct API Calls

**All interactions must use the MCP Server with Pow3r Pass authentication. Do not call REST APIs directly.**

See [MCP Usage Guide](./docs/MCP-USAGE.md) for complete documentation.

### Prerequisites

- Pow3r Pass token from `config.superbots.link`
- Required scopes: `audio:analyze`, `metadata:read`, etc.
- MCP client or HTTP client supporting JSON-RPC 2.0

### Quick Start

```bash
# Set your Pow3r Pass token
export POW3R_PASS_TOKEN="your_pow3r_pass_token"

# Use MCP server (see docs/MCP-USAGE.md for details)
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

### MCP Server Usage

**Endpoint**: `https://essentia-audio-analysis.contact-7d8.workers.dev`

**Required Headers**:
- `Content-Type: application/json`
- `MCP-Protocol-Version: 2024-11-05`
- `Authorization: Bearer <pow3r_pass_token>`

**Available Tools**:
- `analyze_audio` - Full audio analysis with metadata
- `extract_beats` - Beat markers and tempo
- `detect_sections` - Song section detection
- `analyze_psychology` - Psychological descriptors
- `get_metadata` - Retrieve stored results

See [MCP Usage Guide](./docs/MCP-USAGE.md) for complete documentation and examples.

### Legacy REST API (Deprecated)

⚠️ **The REST API is deprecated. Use MCP Server instead.**

The REST API endpoint exists for backward compatibility but should not be used for new integrations. All new code should use the MCP server interface.

#### Response

**Success Response** (200 OK):
```json
{
  "success": true,
  "result": {
    "fft": "https://storage.googleapis.com/essentiajs/analytics/audio/{uuid}-audio/fft.json",
    "dct": "https://storage.googleapis.com/essentiajs/analytics/audio/{uuid}-audio/dct.json",
    "mfcc": "https://storage.googleapis.com/essentiajs/analytics/audio/{uuid}-audio/mfcc.json",
    "chords": "https://storage.googleapis.com/essentiajs/analytics/audio/{uuid}-audio/chords.json",
    "metadata": "https://storage.googleapis.com/essentiajs/analytics/audio/{uuid}-audio/metadata.json",
    // ... more analysis types
  }
}
```

**Metadata Structure** (`metadata.json`):
```json
{
  "song": {
    "duration": 390.5,
    "bpm": 120,
    "key": "C major",
    "storyArc": {
      "tension": [...],
      "release": [...],
      "narrativeStructure": "verse-chorus-verse-chorus-bridge-chorus"
    },
    "psychological": {
      "overallValence": 0.7,
      "overallArousal": 0.8,
      "emotionalTrajectory": [
        {"time": 0, "valence": 0.5, "arousal": 0.6},
        {"time": 60, "valence": 0.8, "arousal": 0.9}
      ],
      "paradigmShifts": [
        {"time": 180, "type": "harmonic", "magnitude": 0.8}
      ]
    },
    "motifs": [
      {
        "id": "motif-melodic-0",
        "type": "melodic",
        "occurrences": [{"start": 10, "end": 15}, {"start": 70, "end": 75}],
        "evolution": "variation"
      }
    ],
    "quotes": [
      {
        "type": "harmonic",
        "original": {"start": 20, "end": 30},
        "quoted": [{"start": 100, "end": 110}]
      }
    ]
  },
  "sections": [
    {
      "type": "verse",
      "start": 0,
      "end": 60,
      "confidence": 0.95,
      "metadata": {
        "bpm": 118,
        "key": "C major",
        "energy": 0.6,
        "psychological": {
          "valence": 0.5,
          "arousal": 0.6
        },
        "motifs": ["motif-melodic-0"],
        "storyArc": "exposition"
      }
    }
  ],
  "loops": [
    {
      "id": "loop-4-0",
      "start": 0,
      "end": 2,
      "length": 4,
      "type": "4-beat",
      "metadata": {
        "energy": 0.7,
        "harmony": ["C", "Am", "F", "G"],
        "psychological": {
          "valence": 0.6,
          "arousal": 0.7
        }
      }
    }
  ],
  "beatMarkers": {
    "bpm": 120,
    "beats": [0, 0.5, 1.0, 1.5, ...],
    "confidence": 0.95,
    "totalBeats": 780
  }
}
```

**Error Response** (400/500):
```json
{
  "success": false,
  "message": "Error description"
}
```

#### Example Usage

**Using MCP Server (Recommended)**:

```bash
# Set Pow3r Pass token
export POW3R_PASS_TOKEN="your_token"

# Use the provided script
node scripts/analyze-via-mcp.js https://example.com/audio.mp3

# Or use cURL directly
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

**Using JavaScript (MCP)**:
```javascript
const POW3R_PASS_TOKEN = process.env.POW3R_PASS_TOKEN;
const MCP_ENDPOINT = 'https://essentia-audio-analysis.contact-7d8.workers.dev';

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
      name: 'analyze_audio',
      arguments: {
        fileUrl: 'https://example.com/audio.mp3',
        includeMetadata: true
      }
    }
  })
});

const data = await response.json();
console.log(data);
```

**Using Python (MCP)**:
```python
import os
import requests

POW3R_PASS_TOKEN = os.environ.get('POW3R_PASS_TOKEN')
MCP_ENDPOINT = 'https://essentia-audio-analysis.contact-7d8.workers.dev'

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
            'name': 'analyze_audio',
            'arguments': {
                'fileUrl': 'https://example.com/audio.mp3',
                'includeMetadata': True
            }
        }
    }
)

data = response.json()
print(data)
```

See [MCP Usage Guide](./docs/MCP-USAGE.md) for complete examples and documentation.

### Deployment

#### Cloudflare Workers

The service is deployed to Cloudflare Workers:

```bash
npm run deploy
```

This command:
1. Patches Essentia.js for Cloudflare Workers compatibility
2. Bundles the worker code
3. Deploys to Cloudflare Workers
4. Configures R2 bucket bindings

#### Environment Variables

Configure in `wrangler.toml` or via Cloudflare dashboard:

- `FRAME_SAMPLE_RATE`: Frame sampling rate (default: 5)
- `WORKER_ENV`: Environment (production/staging)
- `R2_BUCKET`: R2 bucket binding (configured in wrangler.toml)

### Accessing Results

After a successful analysis via MCP, results are returned in the MCP response. You can also access stored results using the `get_metadata` tool:

```javascript
// Get metadata via MCP
const result = await callMCPTool('get_metadata', {
  fileId: 'abc123',
  metadataType: 'all'
});

// Results are also available as MCP resources
// Use resources/list to discover available resources
```

### E2E Testing & Pow3r Integration

The service includes comprehensive E2E testing with Pow3r Workflow Orchestrator and Pow3r Pass authentication.

#### Prerequisites

```bash
# Required environment variables
export POW3R_PASS_TOKEN=your_pow3r_pass_token
export ESSENTIA_URL=https://essentia.yourdomain.workers.dev
export WORKFLOW_URL=https://config.superbots.link/mcp/workflow
export POW3R_PASS_URL=https://config.superbots.link/pass
```

#### Run E2E Tests

```bash
# Install test dependencies
npm install
npx playwright install --with-deps

# Run full E2E test suite
npm run test:e2e

# Run specific test suites
npm run test:e2e:essentia     # Essentia API tests
npm run test:e2e:workflow     # Workflow orchestrator tests

# Deploy and test
./deploy-e2e.sh              # Full deployment + testing
./deploy-e2e.sh essentia-only # Essentia service only
```

#### Pow3r Pass ACL Validation

Tests validate proper permission enforcement:

| Scope | Description | Status |
|-------|-------------|--------|
| `audio:analyze` | Analyze audio files | ✅ Tested |
| `metadata:read` | Read analysis results | ✅ Tested |
| `beats:extract` | Extract beat markers | ✅ Tested |
| `sections:detect` | Detect song sections | ✅ Tested |
| `psychology:analyze` | Psychological analysis | ✅ Tested |

#### Pow3r Workflow Orchestrator

Complex audio analysis pipelines run on Cloudflare Edge:

```javascript
// Example workflow execution
const workflow = {
  name: 'audio-analysis-pipeline',
  steps: [
    'validate-input',
    'download-audio',
    'low-level-analysis',
    'beat-analysis',
    'section-detection',
    'psychological-analysis',
    'compile-results'
  ],
  authentication: {
    pow3rPass: true,
    requiredScopes: ['audio:analyze']
  }
};
```

#### Test Results

- **HTML Report**: `playwright-report/index.html`
- **JSON Results**: `test-results/e2e-results.json`
- **Performance**: Sub-10s API responses, Edge execution validated

## Project Structure

```
Essentia/
├── config/
│   ├── gcpConfig.js      # Google Cloud Storage configuration
│   └── index.js          # Configuration module exports
├── index.js              # Main Express application and API endpoint
├── helpers.js            # Helper functions for enhanced analysis
│                         # - Beat markers and loop slicing
│                         # - Section detection
│                         # - Songwriting metadata extraction
│                         # - Psychological analysis
├── package.json          # Node.js dependencies and scripts
├── Dockerfile            # Docker configuration for deployment
└── README.md             # This file
```

## Dependencies

### Core Dependencies
- **express**: Web framework for Node.js
- **essentia.js**: Audio analysis library (JavaScript port of Essentia)
- **@google-cloud/storage**: Google Cloud Storage client library
- **dotenv**: Environment variable management
- **uuid**: UUID generation for unique file naming
- **cors**: Cross-Origin Resource Sharing middleware
- **body-parser**: Request body parsing middleware

### Development Dependencies
- **@google-cloud/functions-framework**: For local development/testing

## Performance & Optimization

### Frame Sampling

The service uses frame sampling to balance analysis quality with processing time:

- **Default**: Processes every 5th frame (`FRAME_SAMPLE_RATE=5`)
- **Full Processing**: Set `FRAME_SAMPLE_RATE=1` for complete analysis (slower, more accurate)
- **Faster Processing**: Increase to 10-20 for quicker results (less detailed)

**Processing Time Estimates** (for 6.5-minute, 10MB file):
- Frame sampling (5): ~10-30 seconds CPU time
- Full processing (1): ~84-420 seconds CPU time

### Cost Optimization

- Use frame sampling (5-10) for production workloads
- Monitor CPU time to stay within platform limits
- Consider Cloud Run for longer processing times (no 30s CPU limit)

## Limitations & Notes

1. **Frame Sampling**: By default, processes every 5th frame for efficiency. Adjust `FRAME_SAMPLE_RATE` environment variable to change this.

2. **File Size**: The service accepts large files (up to 10GB URL-encoded), but processing time and memory usage will increase with file size.

3. **Temporary Files**: Audio files are downloaded to the local filesystem temporarily and cleaned up after processing. Ensure sufficient disk space is available.

4. **Cloud Storage**: Results are stored in a public Google Cloud Storage bucket. Ensure proper access controls are configured.

5. **Section Detection**: Section classification (verse/chorus/bridge) uses heuristic analysis. Accuracy may vary depending on musical style.

6. **Motif Detection**: Requires minimum 2 occurrences to be identified as a motif. Adjust threshold in code if needed.

## Error Handling

The service includes error handling for:
- Invalid or missing file URLs
- Download failures
- File read errors
- Upload failures to Google Cloud Storage
- Temporary file cleanup errors

All errors return appropriate HTTP status codes and error messages.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC

## Author

Mansoor

## Support

For issues, questions, or contributions, please open an issue on the repository.


