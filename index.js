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
          const frames = essentia.FrameGenerator(buffer)
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

          for (var i = 0; i < frames.size(); i++) {
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

            break
          }

          chords = essentia.ChordsDetection(vecVecFloat)

          chords = {
            chords: essentia.vectorToArray(chords?.chords),
            strength: essentia.vectorToArray(chords?.strength)
          }

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