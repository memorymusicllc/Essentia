# Essentia Audio Analysis Service

A cloud-based audio analysis service that performs comprehensive audio feature extraction using the Essentia.js library. The service accepts audio file URLs, performs extensive audio analysis, and stores the results in Google Cloud Storage.

## Overview

Essentia is a Node.js/Express service that leverages the Essentia.js library (a JavaScript port of the Essentia audio analysis library) to extract detailed audio features from audio files. The service is designed to run on Google Cloud Run and provides a RESTful API for audio analysis tasks.

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

All analysis results are stored as JSON files in Google Cloud Storage and accessible via public URLs.

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

### Prerequisites

- Node.js 14 or higher
- Google Cloud Platform account with:
  - Cloud Storage bucket (`essentiajs`)
  - Service account with Storage Admin permissions
- Environment variables configured (see Configuration)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Essentia
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (see Configuration section)

4. Start the service:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

### Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server port (default: 8080)
PORT=8080

# Google Cloud Service Account Key (JSON string)
service_key='{"type":"service_account","project_id":"your-project-id",...}'

# Frame sampling rate for processing efficiency (default: 5)
# Set to 1 for full processing, higher values for faster processing
# Recommended: 5-10 for balanced quality/performance
FRAME_SAMPLE_RATE=5
```

**Important**: The `service_key` should be a JSON string containing your GCP service account credentials. The service account needs Storage Admin permissions on the `essentiajs` bucket.

### API Usage

#### Endpoint

**POST** `/`

#### Request

Send a POST request with a JSON body containing the audio file URL:

```json
{
  "fileUrl": "https://example.com/audio.mp3"
}
```

**Requirements**:
- `fileUrl` must be a valid HTTPS URL
- The URL must point to an accessible audio file
- Supported formats: MP3, WAV, OGG, FLAC, etc. (formats supported by Essentia.js)

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

**Using cURL**:
```bash
curl -X POST http://localhost:8080/ \
  -H "Content-Type: application/json" \
  -d '{"fileUrl": "https://example.com/sample.mp3"}'
```

**Using JavaScript (fetch)**:
```javascript
const response = await fetch('http://localhost:8080/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fileUrl: 'https://example.com/sample.mp3'
  })
});

const data = await response.json();
console.log(data);
```

**Using Python (requests)**:
```python
import requests

response = requests.post(
    'http://localhost:8080/',
    json={'fileUrl': 'https://example.com/sample.mp3'}
)

data = response.json()
print(data)
```

### Deployment

#### Google Cloud Run

The service includes a deployment script for Google Cloud Run:

```bash
npm run deploy
```

This command:
1. Builds a Docker image
2. Pushes it to Google Container Registry
3. Deploys to Cloud Run
4. Configures traffic routing

#### Manual Docker Deployment

1. Build the Docker image:
```bash
docker build -t essentia .
```

2. Run the container:
```bash
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e service_key='<your-service-key-json>' \
  essentia
```

### Accessing Results

After a successful analysis, each analysis type is stored as a separate JSON file in Google Cloud Storage. You can access them via the URLs returned in the response:

```javascript
// Example: Accessing MFCC results
const mfccUrl = result.mfcc; // From API response
const mfccData = await fetch(mfccUrl).then(r => r.json());
console.log(mfccData);
```

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


