/**
 * Essentia Audio Analysis Service
 * 
 * This service provides audio analysis capabilities using Essentia.js library.
 * It accepts audio file URLs, performs comprehensive audio feature extraction,
 * and stores the results in Google Cloud Storage.
 * 
 * @module index
 */

require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
let { Essentia, EssentiaWASM } = require('essentia.js')
const { storage } = require('./config')
let path = require('path')
let fs = require('fs')
const https = require('https')
const { v4: uuid } = require('uuid')

// Initialize Google Cloud Storage bucket for storing analysis results
const bucket = storage.bucket(`essentiajs`)

// Initialize Express application
const app = express()

// Initialize Essentia audio analysis library with WASM backend
const essentia = new Essentia(EssentiaWASM)

// Server port configuration (defaults to 8080 for Cloud Run compatibility)
const PORT = process.env.PORT || 8080

// Enable CORS for cross-origin requests
app.use(cors())

// Parse JSON request bodies
app.use(bodyParser.json())

// Parse URL-encoded request bodies with large size limit (10GB) for audio file URLs
app.use(express.urlencoded({ limit: '10000mb', extended: true }))

/**
 * Main POST endpoint for audio analysis
 * 
 * Accepts an audio file URL, downloads it, performs comprehensive audio analysis,
 * and uploads results to Google Cloud Storage.
 * 
 * Request body:
 *   - fileUrl (string, required): HTTPS URL to the audio file to analyze
 * 
 * Response:
 *   - success (boolean): Whether the operation succeeded
 *   - result (object): Object containing GCS URLs for each analysis type
 *   - message (string): Error message if operation failed
 * 
 * @route POST /
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing fileUrl
 * @param {string} req.body.fileUrl - HTTPS URL to audio file
 * @param {Object} res - Express response object
 */
app.post('/', (req, res) => {
  try {
    const fileUrl = req?.body?.fileUrl

    // Validate that fileUrl is provided and is an HTTPS URL
    if (!fileUrl || !fileUrl?.startsWith('https')) {
      return res.status(400).send({ success: false, message: 'File Url required!' })
    }

    // Download audio file from provided URL
    https.get(fileUrl, (result) => {
      // Generate unique filename for downloaded audio file
      const file = `${uuid()}-audio`
      const filePath = `${file}.mp3`
      const writeStream = fs.createWriteStream(filePath)

      // Stream the downloaded file to local filesystem
      result.pipe(writeStream)

      // Process file after download completes
      writeStream.on('finish', () => {
        writeStream.close()
        console.log('Download Completed!')
        
        // Read downloaded file into buffer for analysis
        fs.readFile(filePath, async (err, buffer) => {
          if (err) {
            // Clean up file on read error
            try {
              fs.unlinkSync(filePath)
            } catch (unlinkErr) {
              console.error('Error cleaning up file:', unlinkErr)
            }
            return res.status(500).send({ success: false, message: 'Failed to read audio file' })
          }
          // Generate audio frames from buffer for frame-by-frame analysis
          const frames = essentia.FrameGenerator(buffer)
          
          // Initialize arrays to store analysis results for each frame
          let fftArray = []              // Fast Fourier Transform results
          let dctArray = []              // Discrete Cosine Transform results
          let frameCutterArray = []      // Frame cutter output
          let windowingArray = []        // Windowing function results
          let envelopeArray = []         // Envelope detection results
          let barkArray = []             // Bark band analysis
          let melArray = []              // Mel band analysis
          let erbArray = []              // ERB (Equivalent Rectangular Bandwidth) analysis
          let mfccArray = []             // Mel-Frequency Cepstral Coefficients
          let gfccArray = []             // Gammatone-Frequency Cepstral Coefficients
          let lpcArray = []              // Linear Predictive Coding results
          let spectralPeaksArray = []    // Spectral peaks detection
          let complexityArray = []      // Dynamic complexity analysis
          let rollOffArray = []          // Spectral rolloff
          let hfcArray = []              // High Frequency Content
          let pitchSalienceArray = []    // Pitch salience function
          let pitchMelodyArray = []      // Predominant pitch/melody
          let keyArray = []              // Musical key detection
          let scaleArray = []            // Musical scale detection
          let tuningArray = []           // Tuning frequency
          let beatsDetectionArray = []   // Beat detection results
          let bpmArray = []              // BPM (beats per minute) analysis
          let onsetDetectionArray = []   // Onset detection
          let beatsLoudnessArray = []    // Beat loudness analysis
          let danceabilityArray = []     // Danceability metrics
          let dynamicComplexityArray = [] // Dynamic complexity
          let audioSegmentationArray = [] // Audio segmentation
          let hpcpArray = []             // Harmonic Pitch Class Profile (chroma)
          let contrastArray = []         // Spectral contrast
          let inharmonicityArray = []    // Inharmonicity analysis
          let dissonanceArray = []       // Dissonance analysis
          
          // Variables for processing individual frames
          var vector, fft, dct, frameCutter, windowing, envelope, bark, mel, erb, 
              mfcc, mfccNew, gfcc, gfccNew, lpc, lpcNew, spectralPeaks, complexity, 
              rollOff, hfc, pitchSalience, pitchMelody, key, scale, tuningFrequency, 
              beatsDetection, bpm, onsetDetection, rhythm, beatsLoudness, danceability, 
              dynamicComplexity, audioSegmentation, chords, hpcp, contrast, 
              inharmonicity, frequencies, magnitudes, harmonicPeaks, dissonance, signal

          // Vector container for HPCP data needed for chord detection
          let vecVecFloat = new essentia.module.VectorVectorFloat()

          // Compute rhythm transform for the entire audio (global analysis)
          rhythm = essentia.RhythmTransform(frames)

          // Process audio frames (NOTE: Currently only processes first frame due to break statement)
          // This may be intentional for performance, but limits analysis to a single frame
          for (var i = 0; i < frames.size(); i++) {
            // Get current frame signal
            vector = frames.get(i)
            signal = frames.get(i)
            
            // Apply windowing function to reduce spectral leakage
            windowing = essentia.Windowing(vector, true).frame
            vector = essentia.Windowing(vector, true).frame
            
            // Convert time-domain signal to frequency domain using FFT
            vector = essentia.Spectrum(vector)['spectrum']
            
            // === Spectral Analysis ===
            fft = essentia.PitchYinFFT(vector)              // FFT-based pitch detection
            dct = essentia.DCT(vector)                      // Discrete Cosine Transform
            frameCutter = essentia.FrameCutter(signal)      // Frame cutting
            envelope = essentia.Envelope(signal)            // Signal envelope
            bark = essentia.BarkBands(vector)              // Bark scale frequency bands
            mel = essentia.MelBands(vector)                 // Mel scale frequency bands
            erb = essentia.ERBBands(vector)                 // ERB scale frequency bands
            mfcc = essentia.MFCC(vector)                    // Mel-Frequency Cepstral Coefficients
            gfcc = essentia.GFCC(vector)                    // Gammatone-Frequency Cepstral Coefficients
            lpc = essentia.LPC(signal)                      // Linear Predictive Coding
            spectralPeaks = essentia.SpectralPeaks(vector) // Spectral peak detection
            complexity = essentia.DynamicComplexity(vector) // Dynamic complexity
            rollOff = essentia.RollOff(vector)              // Spectral rolloff frequency
            hfc = essentia.HFC(vector)                      // High Frequency Content
            contrast = essentia.SpectralContrast(vector)    // Spectral contrast
            
            // === Pitch and Tonal Analysis ===
            pitchSalience = essentia.PitchSalience(vector)  // Pitch salience function
            pitchMelody = essentia.PredominantPitchMelodia(vector) // Predominant melody extraction
            key = essentia.KeyExtractor(vector)             // Musical key detection
            scale = essentia.Scale(vector)                   // Musical scale detection
            tuningFrequency = essentia.TuningFrequencyExtractor(vector) // Tuning frequency
            
            // === Rhythm Analysis ===
            bpm = essentia.BpmHistogramDescriptors(vector)  // BPM histogram
            onsetDetection = essentia.OnsetDetectionGlobal(vector) // Onset detection
            beatsDetection = essentia.TempoTapDegara(signal) // Beat tracking using Degara algorithm
            
            // === High-Level Descriptors ===
            danceability = essentia.Danceability(vector)     // Danceability metric
            dynamicComplexity = essentia.DynamicComplexity(vector) // Dynamic complexity
            
            // Extract frequencies and magnitudes from spectral peaks for harmonic analysis
            frequencies = spectralPeaks?.frequencies
            magnitudes = spectralPeaks?.magnitudes
            
            // === Harmonic Analysis ===
            hpcp = essentia.HPCP(frequencies, magnitudes)?.hpcp // Harmonic Pitch Class Profile (chroma)
            harmonicPeaks = essentia.HarmonicPeaks(frequencies, magnitudes, 0) // Harmonic peaks
            inharmonicity = essentia.Inharmonicity(harmonicPeaks?.harmonicFrequencies, harmonicPeaks?.harmonicMagnitudes) // Inharmonicity
            dissonance = essentia.Dissonance(frequencies, magnitudes) // Dissonance measure
            
            // === Additional Analysis ===
            beatsLoudness = essentia.Loudness(beatsDetection?.ticks) // Loudness at beat positions
            audioSegmentation = essentia.ZeroCrossingRate(signal) // Zero crossing rate for segmentation

            // Convert Essentia vector objects to JavaScript arrays for JSON serialization
            beatsDetection = {
              ticks: essentia.vectorToArray(beatsDetection?.ticks)
            }

            // Convert danceability DFA (Detrended Fluctuation Analysis) vector to array
            danceability = {
              ...danceability,
              dfa: essentia.vectorToArray(danceability?.dfa)
            }

            // Convert BPM histogram vector to array
            bpm = {
              ...bpm,
              histogram: essentia.vectorToArray(bpm?.histogram)
            }

            // Convert spectral contrast vectors to arrays
            contrast = {
              spectralContrast: essentia.vectorToArray(contrast?.spectralContrast),
              spectralValley: essentia.vectorToArray(contrast?.spectralValley)
            }

            // Convert MFCC vectors to arrays
            mfccNew = {
              bands: essentia.vectorToArray(mfcc?.bands),
              mfcc: essentia.vectorToArray(mfcc?.mfcc)
            }
            
            // Convert GFCC vectors to arrays (note: uses mfcc bands, may be intentional)
            gfccNew = {
              bands: essentia.vectorToArray(mfcc?.bands),
              gfcc: essentia.vectorToArray(gfcc?.gfcc)
            }

            // Convert LPC vectors to arrays
            lpcNew = {
              lpc: essentia.vectorToArray(lpc?.lpc),
              reflection: essentia.vectorToArray(lpc?.reflection)
            }

            // Convert pitch melody vectors to arrays
            pitchMelodyNew = {
              pitch: essentia.vectorToArray(pitchMelody?.pitch),
              pitchConfidence: essentia.vectorToArray(pitchMelody?.pitchConfidence)
            }

            // Convert spectral peaks vectors to arrays
            spectralPeaks = {
              frequencies: essentia.vectorToArray(spectralPeaks?.frequencies),
              magnitudes: essentia.vectorToArray(spectralPeaks?.magnitudes)
            }

            // Store all analysis results for current frame
            audioSegmentationArray.push(audioSegmentation)
            beatsLoudnessArray.push(beatsLoudness)
            beatsDetectionArray.push(beatsDetection)
            fftArray.push(fft)
            dctArray.push(essentia.vectorToArray(dct?.dct))
            frameCutterArray.push(essentia.vectorToArray(frameCutter?.frame))
            windowingArray.push(essentia.vectorToArray(windowing))
            envelopeArray.push(essentia.vectorToArray(envelope?.signal))
            barkArray.push(essentia.vectorToArray(bark?.bands))
            melArray.push(essentia.vectorToArray(mel?.bands))
            erbArray.push(essentia.vectorToArray(erb?.bands))
            mfccArray.push(mfccNew)
            gfccArray.push(gfccNew)
            lpcArray.push(lpcNew)
            complexityArray.push(complexity)
            rollOffArray.push(rollOff?.rollOff)
            hfcArray.push(hfc?.hfc)
            pitchSalienceArray.push(pitchSalience?.pitchSalience)
            pitchMelodyArray.push(pitchMelodyNew)
            keyArray.push(key)
            scaleArray.push(essentia.vectorToArray(scale?.signal))
            tuningArray.push(essentia.vectorToArray(tuningFrequency?.tuningFrequency))
            bpmArray.push(bpm)
            onsetDetectionArray.push(essentia.vectorToArray(onsetDetection?.onsetDetections))
            danceabilityArray.push(danceability)
            dynamicComplexityArray.push(dynamicComplexity)
            spectralPeaksArray.push(spectralPeaks)
            hpcpArray.push(hpcp)
            contrastArray.push(contrast)
            inharmonicityArray.push(inharmonicity)
            dissonanceArray.push(dissonance)

            // Add HPCP data for chord detection (requires multiple frames)
            vecVecFloat.push_back(hpcp)

            // NOTE: Break after first frame - this limits analysis to a single frame
            // Consider removing break to process all frames for complete analysis
            break
          }

          // Perform chord detection using accumulated HPCP data
          chords = essentia.ChordsDetection(vecVecFloat)

          // Convert chord detection results to arrays
          chords = {
            chords: essentia.vectorToArray(chords?.chords),
            strength: essentia.vectorToArray(chords?.strength)
          }

          // Compile all analysis results into a single data object
          let data = {
            fft: fftArray,
            dct: dctArray,
            frameCutter: frameCutterArray,
            windowing: windowingArray,
            envelope: envelopeArray,
            bark: barkArray,
            mel: melArray,
            erb: erbArray,
            mfcc: mfccArray,
            gfcc: gfccArray,
            lpc: lpcArray,
            complexity: complexityArray,
            rollOff: rollOffArray,
            hfc: hfcArray,
            pitchSalience: pitchSalienceArray,
            pitchMelody: pitchMelodyArray,
            rhythm: essentia.vectorToArray(rhythm?.rhythm),
            spectralPeaks: spectralPeaksArray,
            hpcp: hpcpArray,
            contrast: contrastArray,
            inharmonicity: inharmonicityArray,
            dissonance: dissonanceArray,
            chords,
            beatsDetection: beatsDetectionArray,
            beatsLoudness: beatsLoudnessArray,
            audioSegmentation: audioSegmentationArray
          }

          // Clean up downloaded audio file from local filesystem
          try {
            fs.unlinkSync(path.join(__dirname, filePath))
            console.log('Temporary file cleaned up:', filePath)
          }
          catch (err) {
            console.error('Error cleaning up temporary file:', err)
            // Continue execution even if cleanup fails
          }

          // Upload each analysis result type to Google Cloud Storage
          let keys = Object.keys(data)
          let result = {}
          var uploadCount = 0
          var uploadError = null

          // Upload each analysis type as a separate JSON file to GCS
          for (var analysisType of keys) {
            var blob = bucket.file(`analytics/audio/${file}/${analysisType}.json`)
            var blobStream = blob.createWriteStream({
              metadata: {
                contentType: 'application/json',
              }
            })
            
            // Store the public URL for this analysis type
            result[analysisType] = `https://storage.googleapis.com/essentiajs/analytics/audio/${file}/${analysisType}.json`
            
            // Handle successful upload
            blobStream.on('finish', async () => {
              console.log(`Upload completed: ${analysisType}`)
              uploadCount++
              
              // Send response when all uploads complete
              if (uploadCount === keys.length) {
                if (uploadError) {
                  return res.status(500).send({ success: false, message: uploadError })
                }
                return res.send({ success: true, result })
              }
            })
            
            // Handle upload errors
            blobStream.on('error', async (e) => {
              console.error(`Upload error for ${analysisType}:`, e)
              uploadError = uploadError || e.message
              uploadCount++
              
              // Send error response when all uploads are processed
              if (uploadCount === keys.length) {
                return res.status(500).send({ 
                  success: false, 
                  message: uploadError || "Error occurred while uploading files to storage." 
                })
              }
            })
            
            // Write JSON data to GCS
            blobStream.end(JSON.stringify(data[analysisType]))
          }
        })
      })
        .on('error', (e) => {
          // Handle download errors
          console.error('Download error:', e)
          
          // Attempt to clean up file if it was partially downloaded
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath)
            }
          } catch (cleanupErr) {
            console.error('Error during cleanup:', cleanupErr)
          }
          
          return res.status(500).send({ success: false, message: e?.message || 'Failed to download audio file' })
        })
    })
  }
  catch (e) {
    // Handle any synchronous errors
    console.error('Request processing error:', e)
    return res.status(500).send({ success: false, message: e?.message || 'Internal server error' })
  }
})

// Additional body parser middleware (redundant with earlier setup, but kept for compatibility)
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({
  limit: '50mb',
  extended: true,
  parameterLimit: 50000
}))

app.use(express.json())

/**
 * Start the Express server
 * Listens on the configured PORT (default: 8080)
 */
app.listen(PORT, () => {
  console.log(`Essentia Audio Analysis Service running on port ${PORT}`)
})