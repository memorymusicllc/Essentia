/**
 * Audio Analysis Handler for Cloudflare Workers
 *
 * Handles audio analysis requests, downloads files, processes them with Essentia.js,
 * and stores results in Cloudflare R2.
 *
 * @module audio-handler
 */

import { Essentia, EssentiaWASM } from 'essentia.js';
import { v4 as uuid } from 'uuid';
import * as helpers from './helpers.js';
import { getR2Bucket, uploadToR2, getR2PublicUrl } from './config/r2Config.js';

/**
 * Handle audio analysis POST request
 *
 * @param {Request} request - Cloudflare Worker request
 * @param {Object} env - Environment variables and bindings
 * @returns {Response} Analysis results or error
 */
export async function handleAudioAnalysis(request, env) {
  try {
    // Parse request body
    const body = await request.json();
    const fileUrl = body?.fileUrl;

    // Validate file URL
    if (!fileUrl || !fileUrl.startsWith('https://')) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Valid HTTPS file URL required'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    console.log('Starting audio analysis for:', fileUrl);

    // Download audio file
    const audioBuffer = await downloadAudioFile(fileUrl);
    console.log('Audio file downloaded, size:', audioBuffer.byteLength);

    // Initialize Essentia
    const essentia = new Essentia(EssentiaWASM);

    // Process audio with frame sampling for efficiency
    const results = await processAudioWithEssentia(audioBuffer, essentia, env);
    console.log('Audio processing completed');

    // Upload results to R2
    const fileId = uuid();
    const resultUrls = await uploadResultsToR2(results, fileId, env);
    console.log('Results uploaded to R2');

    // Clean up Essentia resources
    essentia.delete();

    return new Response(
      JSON.stringify({
        success: true,
        result: resultUrls,
        fileId: fileId,
        processedAt: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
      }
    );

  } catch (error) {
    console.error('Audio analysis error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Audio analysis failed',
        error: error.name || 'UnknownError'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

/**
 * Download audio file from URL using fetch
 *
 * @param {string} url - HTTPS URL to audio file
 * @returns {Promise<ArrayBuffer>} Audio file buffer
 */
async function downloadAudioFile(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Essentia-Audio-Analysis/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) { // 100MB limit
      throw new Error('File too large (max 100MB)');
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('Download error:', error);
    throw new Error(`Failed to download audio file: ${error.message}`);
  }
}

/**
 * Process audio buffer with Essentia.js
 *
 * @param {ArrayBuffer} audioBuffer - Raw audio data
 * @param {Essentia} essentia - Essentia.js instance
 * @param {Object} env - Environment variables
 * @returns {Promise<Object>} Analysis results
 */
async function processAudioWithEssentia(audioBuffer, essentia, env) {
  try {
    // Decode audio buffer to Float32Array
    const audioData = new Float32Array(audioBuffer);

    // Generate frames from audio data
    const frames = essentia.FrameGenerator(audioData);

    // Configuration for frame sampling
    const frameSampleRate = parseInt(env.FRAME_SAMPLE_RATE) || 5;
    const totalFrames = frames.size();
    const framesToProcess = Math.ceil(totalFrames / frameSampleRate);

    console.log(`Processing ${framesToProcess} of ${totalFrames} frames (sample rate: ${frameSampleRate})`);

    // Initialize result arrays (same as original code)
    let fftArray = [];
    let dctArray = [];
    let frameCutterArray = [];
    let windowingArray = [];
    let envelopeArray = [];
    let barkArray = [];
    let melArray = [];
    let erbArray = [];
    let mfccArray = [];
    let gfccArray = [];
    let lpcArray = [];
    let spectralPeaksArray = [];
    let complexityArray = [];
    let rollOffArray = [];
    let hfcArray = [];
    let pitchSalienceArray = [];
    let pitchMelodyArray = [];
    let keyArray = [];
    let scaleArray = [];
    let tuningArray = [];
    let beatsDetectionArray = [];
    let bpmArray = [];
    let onsetDetectionArray = [];
    let beatsLoudnessArray = [];
    let danceabilityArray = [];
    let dynamicComplexityArray = [];
    let audioSegmentationArray = [];
    let contrastArray = [];
    let inharmonicityArray = [];
    let dissonanceArray = [];

    // Vector for chord detection
    let vecVecFloat = essentia.module.VectorVectorFloat();

    // Global rhythm analysis
    const rhythm = essentia.RhythmTransform(frames);

    // Process frames with sampling
    let processedFrames = 0;
    for (let i = 0; i < frames.size(); i += frameSampleRate) {
      try {
        const vector = frames.get(i);
        const signal = frames.get(i);

        // Apply windowing
        const windowing = essentia.Windowing(vector, true).frame;
        const processedVector = essentia.Windowing(vector, true).frame;

        // Convert to spectrum
        const spectrum = essentia.Spectrum(processedVector)['spectrum'];

        // Perform all analyses (same as original)
        const fft = essentia.PitchYinFFT(spectrum);
        const dct = essentia.DCT(spectrum);
        const frameCutter = essentia.FrameCutter(signal);
        const envelope = essentia.Envelope(signal);
        const bark = essentia.BarkBands(spectrum);
        const mel = essentia.MelBands(spectrum);
        const erb = essentia.ERBBands(spectrum);
        const mfcc = essentia.MFCC(spectrum);
        const gfcc = essentia.GFCC(spectrum);
        const lpc = essentia.LPC(signal);
        const spectralPeaks = essentia.SpectralPeaks(spectrum);
        const complexity = essentia.DynamicComplexity(spectrum);
        const rollOff = essentia.RollOff(spectrum);
        const hfc = essentia.HFC(spectrum);
        const pitchSalience = essentia.PitchSalience(spectrum);
        const pitchMelody = essentia.PredominantPitchMelodia(spectrum);
        const key = essentia.KeyExtractor(spectrum);
        const scale = essentia.Scale(spectrum);
        const tuningFrequency = essentia.TuningFrequencyExtractor(spectrum);
        const bpm = essentia.BpmHistogramDescriptors(spectrum);
        const onsetDetection = essentia.OnsetDetectionGlobal(spectrum);
        const danceability = essentia.Danceability(spectrum);
        const dynamicComplexity = essentia.DynamicComplexity(spectrum);
        const contrast = essentia.SpectralContrast(spectrum);
        const beatsDetection = essentia.TempoTapDegara(signal);

        // Extract frequencies and magnitudes for harmonic analysis
        const frequencies = spectralPeaks?.frequencies;
        const magnitudes = spectralPeaks?.magnitudes;

        let dissonance = null;
        let inharmonicity = null;
        let hpcp = null;

        if (frequencies && magnitudes) {
          hpcp = essentia.HPCP(frequencies, magnitudes)?.hpcp;

          if (hpcp) {
            const harmonicPeaks = essentia.HarmonicPeaks(frequencies, magnitudes, 0);
            inharmonicity = essentia.Inharmonicity(
              harmonicPeaks?.harmonicFrequencies,
              harmonicPeaks?.harmonicMagnitudes
            );
            dissonance = essentia.Dissonance(frequencies, magnitudes);
          }
        }

        const beatsLoudness = essentia.Loudness(beatsDetection?.ticks);
        const audioSegmentation = essentia.ZeroCrossingRate(signal);

        // Convert to JavaScript arrays and store results
        const beatsDetectionConverted = {
          ticks: essentia.vectorToArray(beatsDetection?.ticks)
        };

        const danceabilityConverted = {
          ...danceability,
          dfa: essentia.vectorToArray(danceability?.dfa)
        };

        const bpmConverted = {
          ...bpm,
          histogram: essentia.vectorToArray(bpm?.histogram)
        };

        const contrastConverted = {
          spectralContrast: essentia.vectorToArray(contrast?.spectralContrast),
          spectralValley: essentia.vectorToArray(contrast?.spectralValley)
        };

        const mfccConverted = {
          bands: essentia.vectorToArray(mfcc?.bands),
          mfcc: essentia.vectorToArray(mfcc?.mfcc)
        };

        const gfccConverted = {
          bands: essentia.vectorToArray(mfcc?.bands), // Note: using mfcc bands as per original
          gfcc: essentia.vectorToArray(gfcc?.gfcc)
        };

        const lpcConverted = {
          lpc: essentia.vectorToArray(lpc?.lpc),
          reflection: essentia.vectorToArray(lpc?.reflection)
        };

        const pitchMelodyConverted = {
          pitch: essentia.vectorToArray(pitchMelody?.pitch),
          pitchConfidence: essentia.vectorToArray(pitchMelody?.pitchConfidence)
        };

        const spectralPeaksConverted = {
          frequencies: essentia.vectorToArray(spectralPeaks?.frequencies),
          magnitudes: essentia.vectorToArray(spectralPeaks?.magnitudes)
        };

        // Store all results
        fftArray.push(fft);
        dctArray.push(essentia.vectorToArray(dct?.dct));
        frameCutterArray.push(essentia.vectorToArray(frameCutter?.frame));
        windowingArray.push(essentia.vectorToArray(windowing));
        envelopeArray.push(essentia.vectorToArray(envelope?.signal));
        barkArray.push(essentia.vectorToArray(bark?.bands));
        melArray.push(essentia.vectorToArray(mel?.bands));
        erbArray.push(essentia.vectorToArray(erb?.bands));
        mfccArray.push(mfccConverted);
        gfccArray.push(gfccConverted);
        lpcArray.push(lpcConverted);
        complexityArray.push(complexity);
        rollOffArray.push(rollOff?.rollOff);
        hfcArray.push(hfc?.hfc);
        pitchSalienceArray.push(pitchSalience?.pitchSalience);
        pitchMelodyArray.push(pitchMelodyConverted);
        keyArray.push(key);
        scaleArray.push(essentia.vectorToArray(scale?.signal));
        tuningArray.push(essentia.vectorToArray(tuningFrequency?.tuningFrequency));
        bpmArray.push(bpmConverted);
        onsetDetectionArray.push(essentia.vectorToArray(onsetDetection?.onsetDetections));
        danceabilityArray.push(danceabilityConverted);
        dynamicComplexityArray.push(dynamicComplexity);
        spectralPeaksArray.push(spectralPeaksConverted);
        contrastArray.push(contrastConverted);
        inharmonicityArray.push(inharmonicity);
        dissonanceArray.push(dissonance);
        beatsDetectionArray.push(beatsDetectionConverted);
        beatsLoudnessArray.push(beatsLoudness);
        audioSegmentationArray.push(audioSegmentation);

        if (hpcp) {
          vecVecFloat.push_back(hpcp);
        }

        processedFrames++;

        // Progress logging
        if (processedFrames % 50 === 0) {
          console.log(`Processed ${processedFrames}/${framesToProcess} frames`);
        }

      } catch (frameError) {
        console.warn(`Error processing frame ${i}:`, frameError);
        continue; // Skip problematic frames
      }
    }

    console.log(`Frame processing complete: ${processedFrames} frames processed`);

    // Perform chord detection
    let chords = { chords: [], strength: [] };
    try {
      if (vecVecFloat.size() > 0) {
        chords = essentia.ChordsDetection(vecVecFloat);
        chords = {
          chords: essentia.vectorToArray(chords?.chords),
          strength: essentia.vectorToArray(chords?.strength)
        };
      }
    } catch (chordError) {
      console.warn('Chord detection failed:', chordError);
    }

    // Compile basic results
    const data = {
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
      contrast: contrastArray,
      inharmonicity: inharmonicityArray,
      dissonance: dissonanceArray,
      chords: chords,
      beatsDetection: beatsDetectionArray,
      beatsLoudness: beatsLoudnessArray,
      audioSegmentation: audioSegmentationArray
    };

    // Add enhanced metadata
    const enhancedMetadata = await generateEnhancedMetadata(data, sampleRate = 44100, hopSize = 512);
    data.metadata = enhancedMetadata;

    return data;

  } catch (error) {
    console.error('Audio processing error:', error);
    throw new Error(`Audio processing failed: ${error.message}`);
  }
}

/**
 * Generate enhanced metadata using helper functions
 *
 * @param {Object} data - Basic analysis results
 * @param {number} sampleRate - Audio sample rate
 * @param {number} hopSize - Frame hop size
 * @returns {Promise<Object>} Enhanced metadata
 */
async function generateEnhancedMetadata(data, sampleRate = 44100, hopSize = 512) {
  try {
    console.log('Generating enhanced metadata...');

    // Extract features for metadata analysis
    const features = {
      energy: data.complexity || [],
      tempo: data.bpm || [],
      harmony: data.chords ? [data.chords] : [],
      timbre: data.mfcc || [],
      melody: data.pitchMelody || [],
      danceability: data.danceability || []
    };

    // Beat markers and loop slicing
    console.log('Extracting beat markers and loop points...');
    const allBeats = [];
    (data.beatsDetection || []).forEach(beatData => {
      if (beatData && beatData.ticks) {
        allBeats.push(...beatData.ticks);
      }
    });

    const uniqueBeats = [...new Set(allBeats)].sort((a, b) => a - b);
    let beatMarkers = null;
    let loopPoints = [];

    if (uniqueBeats.length > 0) {
      const intervals = [];
      for (let i = 1; i < uniqueBeats.length; i++) {
        intervals.push(uniqueBeats[i] - uniqueBeats[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const estimatedBPM = 60 / avgInterval;

      beatMarkers = {
        bpm: estimatedBPM,
        beats: uniqueBeats,
        confidence: 0.85,
        totalBeats: uniqueBeats.length
      };

      loopPoints = helpers.generateLoopPoints(uniqueBeats, [4, 8, 16]);
    }

    // Song section detection
    console.log('Detecting song sections...');
    const sections = helpers.detectSongSections(features, sampleRate, hopSize);

    // Motifs and quotes
    console.log('Extracting motifs and quotes...');
    const motifs = helpers.extractMotifs(data.pitchMelody, data.chords ? [data.chords] : [], 2);
    const quotes = helpers.detectQuotes(data.pitchMelody, data.chords ? [data.chords] : []);

    // Story arc analysis
    const storyArc = helpers.analyzeStoryArc(data.pitchMelody, data.chords ? [data.chords] : [], sampleRate, hopSize);

    // Psychological descriptors
    const psychological = helpers.calculatePsychologicalDescriptors(
      data.danceability,
      data.complexity,
      data.bpm,
      sampleRate,
      hopSize
    );

    // Calculate song duration
    const songDuration = (data.fft?.length || 0) * (hopSize / sampleRate);

    // Section-level metadata
    console.log('Analyzing section-level metadata...');
    const sectionsWithMetadata = sections.map(section => {
      const sectionMetadata = helpers.analyzeSectionMetadata(section, features, sampleRate, hopSize);
      return {
        ...section,
        metadata: sectionMetadata
      };
    });

    // Loop-level metadata
    console.log('Analyzing loop-level metadata...');
    const loopsWithMetadata = loopPoints.map(loop => {
      const loopMetadata = helpers.analyzeLoopMetadata(loop, features, sampleRate, hopSize);
      return {
        ...loop,
        metadata: loopMetadata
      };
    });

    // Compile enhanced metadata
    const enhancedMetadata = {
      song: {
        duration: songDuration,
        bpm: beatMarkers?.bpm || 120,
        key: 'unknown', // Would need additional analysis
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
    };

    console.log('Enhanced metadata generation complete');
    return enhancedMetadata;

  } catch (error) {
    console.error('Enhanced metadata generation error:', error);
    // Return basic metadata structure on error
    return {
      song: {
        duration: 0,
        bpm: 120,
        key: 'unknown',
        storyArc: { tension: [], release: [], narrativeStructure: 'unknown' },
        psychological: {
          overallValence: 0.5,
          overallArousal: 0.5,
          emotionalTrajectory: [],
          paradigmShifts: []
        },
        motifs: [],
        quotes: []
      },
      sections: [],
      loops: [],
      beatMarkers: {
        bpm: 120,
        beats: [],
        confidence: 0,
        totalBeats: 0
      }
    };
  }
}

/**
 * Upload analysis results to Cloudflare R2
 *
 * @param {Object} results - Analysis results
 * @param {string} fileId - Unique file identifier
 * @param {Object} env - Environment variables
 * @returns {Promise<Object>} URLs to uploaded results
 */
async function uploadResultsToR2(results, fileId, env) {
  try {
    const bucket = getR2Bucket(env);
    const resultUrls = {};
    const uploadPromises = [];

    // Upload each analysis type
    Object.keys(results).forEach(analysisType => {
      const promise = uploadToR2(
        bucket,
        `analytics/audio/${fileId}/${analysisType}.json`,
        JSON.stringify(results[analysisType]),
        { contentType: 'application/json' }
      ).then(() => {
        resultUrls[analysisType] = `https://${env.CF_ACCOUNT_ID || 'your-account-id'}.r2.cloudflarestorage.com/essentiajs/analytics/audio/${fileId}/${analysisType}.json`;
      }).catch(error => {
        console.error(`Failed to upload ${analysisType}:`, error);
        // Continue with other uploads
      });

      uploadPromises.push(promise);
    });

    // Wait for all uploads to complete
    await Promise.allSettled(uploadPromises);

    return resultUrls;

  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error(`Failed to upload results: ${error.message}`);
  }
}
