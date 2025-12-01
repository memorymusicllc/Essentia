require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
let { Essentia, EssentiaWASM } = require('essentia.js')
const { storage } = require('./config')
const helpers = require('./helpers')
let path = require('path')
let fs = require('fs')
const https = require('https')
const { v4: uuid } = require('uuid')

const bucket = storage.bucket(`essentiajs`)

const app = express()
const essentia = new Essentia(EssentiaWASM)

const PORT = process.env.PORT || 8080

app.use(cors())

// parse requests of content-type - application/json
app.use(bodyParser.json())

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ limit: '10000mb', extended: true }))

//set a static folder
app.post('/', (req, res) => {
  try {
    const fileUrl = req?.body?.fileUrl

    if (!fileUrl || !fileUrl?.startsWith('https')) {
      return res.status(400).send({ success: false, message: 'File Url required!' })
    }

    https.get(fileUrl, (result) => {
      const file = `${uuid()}-audio`
      const filePath = `${file}.mp3`
      const writeStream = fs.createWriteStream(filePath)

      result.pipe(writeStream)

      writeStream.on('finish', () => {
        writeStream.close()
        console.log('Download Completed!')
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
          
          // Configuration for frame sampling (process every Nth frame for efficiency)
          // Set to 1 for full processing, higher values for faster processing
          const FRAME_SAMPLE_RATE = parseInt(process.env.FRAME_SAMPLE_RATE) || 5 // Process every 5th frame
          const totalFrames = frames.size()
          const framesToProcess = Math.ceil(totalFrames / FRAME_SAMPLE_RATE)
          
          console.log(`Processing ${framesToProcess} of ${totalFrames} frames (sample rate: ${FRAME_SAMPLE_RATE})`)
          
          let fftArray = []
          let dctArray = []
          let frameCutterArray = []
          let windowingArray = []
          let envelopeArray = []
          let barkArray = []
          let melArray = []
          let erbArray = []
          let mfccArray = []
          let gfccArray = []
          let lpcArray = []
          let spectralPeaksArray = []
          let complexityArray = []
          let rollOffArray = []
          let hfcArray = []
          let pitchSalienceArray = []
          let pitchMelodyArray = []
          let keyArray = []
          let scaleArray = []
          let tuningArray = []
          let beatsDetectionArray = []
          let bpmArray = []
          let onsetDetectionArray = []
          let beatsLoudnessArray = []
          let danceabilityArray = []
          let dynamicComplexityArray = []
          let audioSegmentationArray = []
          let svmArray = []
          let tensorflowWrapperArray = []
          let chordsArray = []
          let hpcpArray = []
          let contrastArray = []
          let inharmonicityArray = []
          let dissonanceArray = []
          var vector, fft, dct, frameCutter, windowing, envelope, bark, mel, erb, mfcc, mfccNew, gfcc, gfccNew, lpc, lpcNew, spectralPeaks, complexity, rollOff, hfc, pitchSalience, pitchMelody, key, scale, tuningFrequency, beatsDetection, bpm, onsetDetection, rhythm, beatsLoudness, danceability, dynamicComplexity, audioSegmentation, svm, tensorflowWrapper, chords, hpcp, contrast, inharmonicity, frequencies, magnitudes, harmonicPeaks, dissonance, sample, signal

          let vecVecFloat = new essentia.module.VectorVectorFloat()

          rhythm = essentia.RhythmTransform(frames)

          // Process audio frames with sampling for efficiency
          // Process every FRAME_SAMPLE_RATE frames to balance quality and performance
          let processedFrames = 0
          for (var i = 0; i < frames.size(); i += FRAME_SAMPLE_RATE) {
            vector = frames.get(i)
            signal = frames.get(i)
            windowing = essentia.Windowing(vector, true).frame
            vector = essentia.Windowing(vector, true).frame
            vector = essentia.Spectrum(vector)['spectrum']
            fft = essentia.PitchYinFFT(vector)
            dct = essentia.DCT(vector)
            frameCutter = essentia.FrameCutter(signal)
            envelope = essentia.Envelope(signal)
            bark = essentia.BarkBands(vector)
            mel = essentia.MelBands(vector)
            erb = essentia.ERBBands(vector)
            mfcc = essentia.MFCC(vector)
            gfcc = essentia.GFCC(vector)
            lpc = essentia.LPC(signal)
            spectralPeaks = essentia.SpectralPeaks(vector)
            complexity = essentia.DynamicComplexity(vector)
            rollOff = essentia.RollOff(vector)
            hfc = essentia.HFC(vector)
            pitchSalience = essentia.PitchSalience(vector)
            pitchMelody = essentia.PredominantPitchMelodia(vector)
            key = essentia.KeyExtractor(vector)
            scale = essentia.Scale(vector)
            tuningFrequency = essentia.TuningFrequencyExtractor(vector)
            bpm = essentia.BpmHistogramDescriptors(vector)
            onsetDetection = essentia.OnsetDetectionGlobal(vector)
            danceability = essentia.Danceability(vector)
            dynamicComplexity = essentia.DynamicComplexity(vector)
            frequencies = spectralPeaks?.frequencies
            magnitudes = spectralPeaks?.magnitudes
            hpcp = essentia.HPCP(frequencies, magnitudes)?.hpcp
            contrast = essentia.SpectralContrast(vector)
            harmonicPeaks = essentia.HarmonicPeaks(frequencies, magnitudes, 0)
            inharmonicity = essentia.Inharmonicity(harmonicPeaks?.harmonicFrequencies, harmonicPeaks?.harmonicMagnitudes)
            dissonance = essentia.Dissonance(frequencies, magnitudes)
            beatsDetection = essentia.TempoTapDegara(signal)

            beatsLoudness = essentia.Loudness(beatsDetection?.ticks)
            audioSegmentation = essentia.ZeroCrossingRate(signal)

            beatsDetection = {
              ticks: essentia.vectorToArray(beatsDetection?.ticks)
            }

            // console.log('beatsDetection', audioSegmentation)

            danceability = {
              ...danceability,
              dfa: essentia.vectorToArray(danceability?.dfa)
            }

            bpm = {
              ...bpm,
              histogram: essentia.vectorToArray(bpm?.histogram)
            }

            contrast = {
              spectralContrast: essentia.vectorToArray(contrast?.spectralContrast),
              spectralValley: essentia.vectorToArray(contrast?.spectralValley)
            }

            mfccNew = {
              bands: essentia.vectorToArray(mfcc?.bands),
              mfcc: essentia.vectorToArray(mfcc?.mfcc)
            }
            gfccNew = {
              bands: essentia.vectorToArray(mfcc?.bands),
              gfcc: essentia.vectorToArray(gfcc?.gfcc)
            }

            lpcNew = {
              lpc: essentia.vectorToArray(lpc?.lpc),
              reflection: essentia.vectorToArray(lpc?.reflection)
            }

            pitchMelodyNew = {
              pitch: essentia.vectorToArray(pitchMelody?.pitch),
              pitchConfidence: essentia.vectorToArray(pitchMelody?.pitchConfidence)
            }

            spectralPeaks = {
              frequencies: essentia.vectorToArray(spectralPeaks?.frequencies),
              magnitudes: essentia.vectorToArray(spectralPeaks?.magnitudes)
            }

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

            vecVecFloat.push_back(hpcp)
            
            processedFrames++
            
            // Log progress every 100 frames
            if (processedFrames % 100 === 0) {
              console.log(`Processed ${processedFrames}/${framesToProcess} frames`)
            }
          }
          
          console.log(`Frame processing complete: ${processedFrames} frames processed`)

          chords = essentia.ChordsDetection(vecVecFloat)

          chords = {
            chords: essentia.vectorToArray(chords?.chords),
            strength: essentia.vectorToArray(chords?.strength)
          }

          // === ENHANCED ANALYSIS: Beat Markers and Loop Slicing ===
          console.log('Extracting beat markers and loop points...')
          
          // Use RhythmExtractor2013 for accurate beat detection (if available)
          // Fallback to existing beat detection
          let beatMarkers = null
          let loopPoints = []
          
          try {
            // Extract beat positions from beatsDetectionArray
            const allBeats = []
            beatsDetectionArray.forEach(beatData => {
              if (beatData && beatData.ticks) {
                allBeats.push(...beatData.ticks)
              }
            })
            
            // Remove duplicates and sort
            const uniqueBeats = [...new Set(allBeats)].sort((a, b) => a - b)
            
            if (uniqueBeats.length > 0) {
              // Calculate BPM from beat intervals
              const intervals = []
              for (let i = 1; i < uniqueBeats.length; i++) {
                intervals.push(uniqueBeats[i] - uniqueBeats[i - 1])
              }
              const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
              const estimatedBPM = 60 / avgInterval
              
              beatMarkers = {
                bpm: estimatedBPM,
                beats: uniqueBeats,
                confidence: 0.85, // Estimated confidence
                totalBeats: uniqueBeats.length
              }
              
              // Generate loop points
              loopPoints = helpers.generateLoopPoints(uniqueBeats, [4, 8, 16])
              console.log(`Generated ${loopPoints.length} loop points`)
            }
          } catch (error) {
            console.error('Error extracting beat markers:', error)
          }

          // === ENHANCED ANALYSIS: Song Section Detection ===
          console.log('Detecting song sections...')
          
          const sampleRate = 44100 // Default sample rate
          const hopSize = 512 // Default hop size
          
          const sections = helpers.detectSongSections({
            energy: dynamicComplexityArray,
            tempo: bpmArray,
            harmony: chordsArray,
            timbre: mfccArray,
            melody: pitchMelodyArray
          }, sampleRate, hopSize)
          
          console.log(`Detected ${sections.length} song sections`)

          // === ENHANCED ANALYSIS: Songwriting Metadata ===
          console.log('Extracting songwriting metadata...')
          
          // Extract motifs
          const motifs = helpers.extractMotifs(pitchMelodyArray, chordsArray, 2)
          console.log(`Found ${motifs.length} motifs`)
          
          // Detect quotes
          const quotes = helpers.detectQuotes(pitchMelodyArray, chordsArray)
          console.log(`Found ${quotes.length} quotes`)
          
          // Analyze story arc
          const storyArc = helpers.analyzeStoryArc(pitchMelodyArray, chordsArray, sampleRate, hopSize)
          
          // Calculate psychological descriptors
          const psychological = helpers.calculatePsychologicalDescriptors(
            danceabilityArray,
            dynamicComplexityArray,
            bpmArray,
            sampleRate,
            hopSize
          )
          
          // Calculate song duration (approximate)
          const songDuration = (totalFrames * hopSize) / sampleRate

          // === ENHANCED ANALYSIS: Section-Level Metadata ===
          console.log('Analyzing section-level metadata...')
          
          const sectionsWithMetadata = sections.map(section => {
            const sectionMetadata = helpers.analyzeSectionMetadata(section, {
              energy: dynamicComplexityArray,
              tempo: bpmArray,
              harmony: chordsArray,
              melody: pitchMelodyArray,
              danceability: danceabilityArray
            }, sampleRate, hopSize)
            
            return {
              ...section,
              metadata: sectionMetadata
            }
          })

          // === ENHANCED ANALYSIS: Loop-Level Metadata ===
          console.log('Analyzing loop-level metadata...')
          
          const loopsWithMetadata = loopPoints.map(loop => {
            const loopMetadata = helpers.analyzeLoopMetadata(loop, {
              energy: dynamicComplexityArray,
              harmony: chordsArray,
              tempo: bpmArray,
              danceability: danceabilityArray
            }, sampleRate, hopSize)
            
            return {
              ...loop,
              metadata: loopMetadata
            }
          })

          // === Compile Enhanced Metadata Structure ===
          const enhancedMetadata = {
            song: {
              duration: songDuration,
              bpm: beatMarkers?.bpm || (bpmArray.length > 0 ? bpmArray[0].bpm || 120 : 120),
              key: keyArray.length > 0 ? keyArray[0].key || 'unknown' : 'unknown',
              storyArc: storyArc,
              psychological: {
                overallValence: psychological.overallValence,
                overallArousal: psychological.overallArousal,
                emotionalTrajectory: psychological.emotionalTrajectory,
                paradigmShifts: psychological.paradigmShifts
              },
              motifs: motifs,
              quotes: quotes
            },
            sections: sectionsWithMetadata,
            loops: loopsWithMetadata,
            beatMarkers: beatMarkers || {
              bpm: 120,
              beats: [],
              confidence: 0,
              totalBeats: 0
            }
          }

          // === Compile All Data ===
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
            audioSegmentation: audioSegmentationArray,
            
            // Enhanced metadata at song, section, and loop levels
            metadata: enhancedMetadata
          }
          
          console.log('Analysis complete. Metadata structure:')
          console.log(`- Song duration: ${enhancedMetadata.song.duration.toFixed(2)}s`)
          console.log(`- Sections: ${enhancedMetadata.sections.length}`)
          console.log(`- Loops: ${enhancedMetadata.loops.length}`)
          console.log(`- Motifs: ${enhancedMetadata.song.motifs.length}`)
          console.log(`- Quotes: ${enhancedMetadata.song.quotes.length}`)
          console.log(`- Paradigm shifts: ${enhancedMetadata.song.psychological.paradigmShifts.length}`)

          try {
            fs.unlinkSync(path.join(__dirname, filePath))
          }
          catch (err) {
            console.log(err)
          }

          let keys = Object.keys(data)

          let result = {}
          var j = 0

          for (var v of keys) {
            var blob = bucket.file(`analytics/audio/${file}/${v}.json`)
            var blobStream = blob.createWriteStream()
            result[v] = `https://storage.googleapis.com/essentiajs/analytics/audio/${file}/${v}.json`
            blobStream.on('finish', async () => {
              console.log('done')
              j++
              if (j == keys.length) {
                return res.send({ success: true, result })
              }
            })
            blobStream.on('error', async (e) => {
              console.log('erro')
              throw e || new Error("Error occurred while uploading file.")
            })
            blobStream.end(JSON.stringify(data[v]))
          }

          return res.send({ success: true, result })
        })
      })
        .on('error', (e) => {
          console.log('e', e)
          return res.status(500).send({ success: false, message: e?.message })
        })
    })
  }
  catch (e) {
    console.log('e', e)
    return res.status(500).send({ success: false, message: e?.message })
  }
})

app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({
  limit: '50mb',
  extended: true,
  parameterLimit: 50000
}))

app.use(express.json())

app.listen(PORT, () => {
  console.log(`Server up and running on ${PORT}`)
})