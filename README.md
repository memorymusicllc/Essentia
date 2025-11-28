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
    // ... more analysis types
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
├── helpers.js             # Helper functions (currently empty)
├── package.json           # Node.js dependencies and scripts
├── Dockerfile             # Docker configuration for deployment
└── README.md              # This file
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

## Limitations & Notes

1. **Single Frame Processing**: The current implementation processes only the first frame of audio due to a `break` statement in the frame processing loop. This may be intentional for performance but limits the analysis scope.

2. **File Size**: The service accepts large files (up to 10GB URL-encoded), but processing time and memory usage will increase with file size.

3. **Temporary Files**: Audio files are downloaded to the local filesystem temporarily and cleaned up after processing. Ensure sufficient disk space is available.

4. **Cloud Storage**: Results are stored in a public Google Cloud Storage bucket. Ensure proper access controls are configured.

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

