/**
 * Helper Functions for Enhanced Audio Analysis
 * 
 * Provides utilities for beat markers, loop slicing, section detection,
 * and songwriting metadata extraction.
 * 
 * @module helpers
 */

/**
 * Generate loop points from beat positions
 * Creates loop markers at different lengths (4, 8, 16 beats)
 * 
 * @param {Array} beats - Array of beat positions in seconds
 * @param {Array} loopLengths - Array of loop lengths in beats (e.g., [4, 8, 16])
 * @param {number} sampleRate - Audio sample rate
 * @returns {Array} Array of loop point objects
 */
function generateLoopPoints(beats, loopLengths = [4, 8, 16], sampleRate = 44100) {
  const loops = []
  
  if (!beats || beats.length < 2) {
    return loops
  }
  
  // Calculate average beat interval
  const beatIntervals = []
  for (let i = 1; i < beats.length; i++) {
    beatIntervals.push(beats[i] - beats[i - 1])
  }
  const avgBeatInterval = beatIntervals.reduce((a, b) => a + b, 0) / beatIntervals.length
  
  // Generate loops for each specified length
  loopLengths.forEach(length => {
    const loopDuration = length * avgBeatInterval
    
    // Create loops starting at each beat
    for (let i = 0; i < beats.length - length; i += length) {
      const start = beats[i]
      const end = start + loopDuration
      
      // Only add if we have enough beats
      if (end <= beats[beats.length - 1]) {
        loops.push({
          id: `loop-${length}-${i}`,
          start: start,
          end: end,
          length: length,
          type: `${length}-beat`,
          startBeat: i,
          endBeat: i + length
        })
      }
    }
  })
  
  return loops
}

/**
 * Detect song sections using feature analysis
 * Analyzes energy, tempo, harmony, and timbre changes to identify sections
 * 
 * @param {Object} features - Feature arrays for analysis
 * @param {Array} features.energy - Dynamic complexity array
 * @param {Array} features.tempo - BPM array
 * @param {Array} features.harmony - Chords array
 * @param {Array} features.timbre - MFCC array
 * @param {Array} features.melody - Pitch melody array
 * @param {number} sampleRate - Audio sample rate
 * @param {number} hopSize - Frame hop size
 * @returns {Array} Array of section objects
 */
function detectSongSections(features, sampleRate = 44100, hopSize = 512) {
  const sections = []
  const frameDuration = hopSize / sampleRate
  
  if (!features.energy || features.energy.length === 0) {
    return sections
  }
  
  // Calculate feature statistics over windows
  const windowSize = Math.floor(2 / frameDuration) // 2-second windows
  const windows = []
  
  for (let i = 0; i < features.energy.length; i += windowSize) {
    const window = {
      startFrame: i,
      endFrame: Math.min(i + windowSize, features.energy.length),
      energy: [],
      tempo: [],
      harmony: [],
      timbre: []
    }
    
    // Extract features for this window
    for (let j = window.startFrame; j < window.endFrame && j < features.energy.length; j++) {
      if (features.energy[j] !== undefined) {
        window.energy.push(typeof features.energy[j] === 'object' ? features.energy[j].value || 0 : features.energy[j])
      }
      if (features.tempo && features.tempo[j]) {
        window.tempo.push(features.tempo[j].bpm || 0)
      }
      if (features.harmony && features.harmony[j]) {
        window.harmony.push(features.harmony[j])
      }
      if (features.timbre && features.timbre[j]) {
        window.timbre.push(features.timbre[j])
      }
    }
    
    windows.push(window)
  }
  
  // Calculate statistics for each window
  const windowStats = windows.map(window => ({
    start: window.startFrame * frameDuration,
    end: window.endFrame * frameDuration,
    avgEnergy: window.energy.length > 0 ? window.energy.reduce((a, b) => a + b, 0) / window.energy.length : 0,
    maxEnergy: window.energy.length > 0 ? Math.max(...window.energy) : 0,
    avgTempo: window.tempo.length > 0 ? window.tempo.reduce((a, b) => a + b, 0) / window.tempo.length : 0,
    energyVariance: calculateVariance(window.energy),
    harmonyChange: detectHarmonyChange(window.harmony),
    timbreChange: detectTimbreChange(window.timbre)
  }))
  
  // Detect section boundaries based on feature changes
  const boundaries = [0] // Start at beginning
  
  for (let i = 1; i < windowStats.length - 1; i++) {
    const prev = windowStats[i - 1]
    const curr = windowStats[i]
    const next = windowStats[i + 1]
    
    // Detect significant changes
    const energyChange = Math.abs(curr.avgEnergy - prev.avgEnergy) / (prev.avgEnergy + 0.001)
    const tempoChange = Math.abs(curr.avgTempo - prev.avgTempo) / (prev.avgTempo + 0.001)
    const harmonyChange = curr.harmonyChange
    const timbreChange = curr.timbreChange
    
    // Threshold for section boundary
    if (energyChange > 0.3 || tempoChange > 0.15 || harmonyChange > 0.5 || timbreChange > 0.4) {
      boundaries.push(i)
    }
  }
  
  boundaries.push(windowStats.length - 1) // End at last window
  
  // Classify sections
  for (let i = 0; i < boundaries.length - 1; i++) {
    const startIdx = boundaries[i]
    const endIdx = boundaries[i + 1]
    const sectionWindows = windowStats.slice(startIdx, endIdx + 1)
    
    const avgEnergy = sectionWindows.reduce((sum, w) => sum + w.avgEnergy, 0) / sectionWindows.length
    const avgTempo = sectionWindows.reduce((sum, w) => sum + w.avgTempo, 0) / sectionWindows.length
    const energyVariance = sectionWindows.reduce((sum, w) => sum + w.energyVariance, 0) / sectionWindows.length
    
    // Classify section type
    let type = 'verse' // Default
    let confidence = 0.5
    
    if (avgEnergy > 0.7 && energyVariance < 0.1) {
      type = 'chorus'
      confidence = 0.8
    } else if (avgEnergy < 0.3) {
      type = 'intro'
      confidence = 0.7
    } else if (i === boundaries.length - 2 && avgEnergy < 0.4) {
      type = 'outro'
      confidence = 0.7
    } else if (energyVariance > 0.3) {
      type = 'bridge'
      confidence = 0.6
    }
    
    sections.push({
      type: type,
      start: sectionWindows[0].start,
      end: sectionWindows[sectionWindows.length - 1].end,
      confidence: confidence,
      metadata: {
        avgEnergy: avgEnergy,
        avgTempo: avgTempo,
        energyVariance: energyVariance
      }
    })
  }
  
  return sections
}

/**
 * Calculate variance of an array
 */
function calculateVariance(arr) {
  if (arr.length === 0) return 0
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length
  return variance
}

/**
 * Detect harmony changes in a window
 */
function detectHarmonyChange(harmony) {
  if (!harmony || harmony.length < 2) return 0
  
  let changes = 0
  for (let i = 1; i < harmony.length; i++) {
    if (JSON.stringify(harmony[i]) !== JSON.stringify(harmony[i - 1])) {
      changes++
    }
  }
  return changes / harmony.length
}

/**
 * Detect timbre changes in a window
 */
function detectTimbreChange(timbre) {
  if (!timbre || timbre.length < 2) return 0
  
  // Calculate MFCC distance between consecutive frames
  let totalDistance = 0
  for (let i = 1; i < timbre.length; i++) {
    if (timbre[i].mfcc && timbre[i - 1].mfcc) {
      const distance = euclideanDistance(timbre[i].mfcc, timbre[i - 1].mfcc)
      totalDistance += distance
    }
  }
  return totalDistance / (timbre.length - 1)
}

/**
 * Calculate Euclidean distance between two arrays
 */
function euclideanDistance(arr1, arr2) {
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return 0
  let sum = 0
  for (let i = 0; i < arr1.length; i++) {
    sum += Math.pow(arr1[i] - arr2[i], 2)
  }
  return Math.sqrt(sum)
}

/**
 * Extract motifs from pitch melody and chords
 * Identifies recurring melodic and harmonic patterns
 * 
 * @param {Array} pitchMelody - Pitch melody array
 * @param {Array} chords - Chords array
 * @param {number} minOccurrences - Minimum occurrences to be considered a motif
 * @returns {Array} Array of motif objects
 */
function extractMotifs(pitchMelody, chords, minOccurrences = 2) {
  const motifs = []
  
  // Extract melodic motifs
  if (pitchMelody && pitchMelody.length > 0) {
    const melodicMotifs = findRepeatingPatterns(pitchMelody, 'melodic', minOccurrences)
    motifs.push(...melodicMotifs)
  }
  
  // Extract harmonic motifs
  if (chords && chords.length > 0) {
    const harmonicMotifs = findRepeatingPatterns(chords, 'harmonic', minOccurrences)
    motifs.push(...harmonicMotifs)
  }
  
  return motifs
}

/**
 * Find repeating patterns in feature arrays
 */
function findRepeatingPatterns(features, type, minOccurrences) {
  const motifs = []
  const patternLength = 4 // Look for 4-frame patterns
  const patterns = new Map()
  
  // Extract all patterns
  for (let i = 0; i < features.length - patternLength; i++) {
    const pattern = extractPattern(features, i, patternLength, type)
    const patternKey = JSON.stringify(pattern)
    
    if (!patterns.has(patternKey)) {
      patterns.set(patternKey, {
        pattern: pattern,
        occurrences: []
      })
    }
    
    patterns.get(patternKey).occurrences.push(i)
  }
  
  // Find patterns that repeat
  patterns.forEach((data, key) => {
    if (data.occurrences.length >= minOccurrences) {
      motifs.push({
        id: `motif-${type}-${motifs.length}`,
        type: type,
        pattern: data.pattern,
        occurrences: data.occurrences.map(idx => ({
          start: idx,
          end: idx + patternLength
        })),
        evolution: detectPatternEvolution(data.pattern, data.occurrences, features)
      })
    }
  })
  
  return motifs
}

/**
 * Extract a pattern from features
 */
function extractPattern(features, start, length, type) {
  const pattern = []
  for (let i = start; i < start + length && i < features.length; i++) {
    if (type === 'melodic' && features[i] && features[i].pitch) {
      pattern.push(features[i].pitch.slice(0, 5)) // First 5 pitch values
    } else if (type === 'harmonic' && features[i] && features[i].chords) {
      pattern.push(features[i].chords.slice(0, 4)) // First 4 chords
    }
  }
  return pattern
}

/**
 * Detect pattern evolution
 */
function detectPatternEvolution(pattern, occurrences, features) {
  if (occurrences.length < 2) return 'stable'
  
  // Compare first and last occurrence
  const first = extractPattern(features, occurrences[0], pattern.length, 'melodic')
  const last = extractPattern(features, occurrences[occurrences.length - 1], pattern.length, 'melodic')
  
  const similarity = calculatePatternSimilarity(first, last)
  
  if (similarity > 0.8) return 'stable'
  if (similarity > 0.5) return 'variation'
  return 'transformation'
}

/**
 * Calculate pattern similarity
 */
function calculatePatternSimilarity(pattern1, pattern2) {
  if (!pattern1 || !pattern2 || pattern1.length !== pattern2.length) return 0
  
  let matches = 0
  for (let i = 0; i < pattern1.length; i++) {
    if (Array.isArray(pattern1[i]) && Array.isArray(pattern2[i])) {
      const similarity = euclideanDistance(pattern1[i], pattern2[i])
      if (similarity < 0.1) matches++
    }
  }
  
  return matches / pattern1.length
}

/**
 * Detect quotes (repeated phrases) in audio
 * Identifies melodic and harmonic quotes
 * 
 * @param {Array} pitchMelody - Pitch melody array
 * @param {Array} chords - Chords array
 * @returns {Array} Array of quote objects
 */
function detectQuotes(pitchMelody, chords) {
  const quotes = []
  
  // Find melodic quotes
  if (pitchMelody && pitchMelody.length > 0) {
    const melodicQuotes = findQuotes(pitchMelody, 'melodic', 8) // 8-frame phrases
    quotes.push(...melodicQuotes)
  }
  
  // Find harmonic quotes
  if (chords && chords.length > 0) {
    const harmonicQuotes = findQuotes(chords, 'harmonic', 8)
    quotes.push(...harmonicQuotes)
  }
  
  return quotes
}

/**
 * Find quotes (repeated longer phrases)
 */
function findQuotes(features, type, phraseLength) {
  const quotes = []
  const phrases = new Map()
  
  // Extract all phrases
  for (let i = 0; i < features.length - phraseLength; i++) {
    const phrase = extractPattern(features, i, phraseLength, type)
    const phraseKey = JSON.stringify(phrase)
    
    if (!phrases.has(phraseKey)) {
      phrases.set(phraseKey, [])
    }
    
    phrases.get(phraseKey).push(i)
  }
  
  // Find phrases that appear multiple times
  phrases.forEach((occurrences, key) => {
    if (occurrences.length >= 2) {
      const original = occurrences[0]
      const quoted = occurrences.slice(1)
      
      quotes.push({
        type: type,
        original: {
          start: original,
          end: original + phraseLength
        },
        quoted: quoted.map(idx => ({
          start: idx,
          end: idx + phraseLength
        }))
      })
    }
  })
  
  return quotes
}

/**
 * Analyze story arc from pitch and harmony
 * Tracks tension and release patterns
 * 
 * @param {Array} pitchMelody - Pitch melody array
 * @param {Array} chords - Chords array
 * @param {number} sampleRate - Audio sample rate
 * @param {number} hopSize - Frame hop size
 * @returns {Object} Story arc analysis
 */
function analyzeStoryArc(pitchMelody, chords, sampleRate = 44100, hopSize = 512) {
  const frameDuration = hopSize / sampleRate
  const tension = []
  const release = []
  
  // Calculate tension based on dissonance and pitch movement
  if (pitchMelody && pitchMelody.length > 0) {
    for (let i = 0; i < pitchMelody.length; i++) {
      const frame = pitchMelody[i]
      if (frame && frame.pitch) {
        // Tension from pitch variance
        const pitchVariance = calculateVariance(frame.pitch.filter(p => p > 0))
        tension.push({
          time: i * frameDuration,
          value: pitchVariance
        })
      }
    }
  }
  
  // Calculate release points (low tension areas)
  tension.forEach((point, i) => {
    if (i > 0 && i < tension.length - 1) {
      const prev = tension[i - 1].value
      const curr = point.value
      const next = tension[i + 1].value
      
      if (curr < prev && curr < next) {
        release.push({
          time: point.time,
          value: curr
        })
      }
    }
  })
  
  return {
    tension: tension,
    release: release,
    narrativeStructure: inferNarrativeStructure(tension, release)
  }
}

/**
 * Infer narrative structure from tension/release
 */
function inferNarrativeStructure(tension, release) {
  // Simple heuristic: identify major sections based on tension peaks
  const peaks = findPeaks(tension.map(t => t.value))
  const structure = []
  
  peaks.forEach((peak, i) => {
    if (i === 0) structure.push('intro')
    else if (i % 2 === 1) structure.push('verse')
    else structure.push('chorus')
  })
  
  if (structure.length === 0) return 'unknown'
  return structure.join('-')
}

/**
 * Find peaks in an array
 */
function findPeaks(arr, threshold = 0.5) {
  const peaks = []
  for (let i = 1; i < arr.length - 1; i++) {
    if (arr[i] > arr[i - 1] && arr[i] > arr[i + 1] && arr[i] > threshold) {
      peaks.push(i)
    }
  }
  return peaks
}

/**
 * Calculate psychological descriptors
 * Valence (positive/negative emotion) and Arousal (energy/intensity)
 * 
 * @param {Array} danceability - Danceability array
 * @param {Array} energy - Dynamic complexity array
 * @param {Array} tempo - BPM array
 * @param {number} sampleRate - Audio sample rate
 * @param {number} hopSize - Frame hop size
 * @returns {Object} Psychological analysis
 */
function calculatePsychologicalDescriptors(danceability, energy, tempo, sampleRate = 44100, hopSize = 512) {
  const frameDuration = hopSize / sampleRate
  const trajectory = []
  
  const maxFrames = Math.max(
    danceability?.length || 0,
    energy?.length || 0,
    tempo?.length || 0
  )
  
  for (let i = 0; i < maxFrames; i++) {
    const dance = danceability && danceability[i] ? 
      (typeof danceability[i] === 'object' ? danceability[i].value || 0 : danceability[i]) : 0.5
    const en = energy && energy[i] ? 
      (typeof energy[i] === 'object' ? energy[i].value || 0 : energy[i]) : 0.5
    const temp = tempo && tempo[i] ? 
      (typeof tempo[i] === 'object' ? tempo[i].bpm || 120 : tempo[i]) : 120
    
    // Valence from danceability (positive = high danceability)
    const valence = Math.min(1, Math.max(0, dance))
    
    // Arousal from energy and tempo
    const normalizedTempo = Math.min(1, temp / 200) // Normalize to 0-1
    const arousal = (en * 0.6 + normalizedTempo * 0.4)
    
    trajectory.push({
      time: i * frameDuration,
      valence: valence,
      arousal: arousal
    })
  }
  
  // Calculate overall values
  const overallValence = trajectory.length > 0 ?
    trajectory.reduce((sum, t) => sum + t.valence, 0) / trajectory.length : 0.5
  const overallArousal = trajectory.length > 0 ?
    trajectory.reduce((sum, t) => sum + t.arousal, 0) / trajectory.length : 0.5
  
  // Detect paradigm shifts (sudden changes)
  const paradigmShifts = detectParadigmShifts(trajectory)
  
  return {
    overallValence: overallValence,
    overallArousal: overallArousal,
    emotionalTrajectory: trajectory,
    paradigmShifts: paradigmShifts
  }
}

/**
 * Detect paradigm shifts (sudden emotional changes)
 */
function detectParadigmShifts(trajectory, threshold = 0.3) {
  const shifts = []
  
  for (let i = 1; i < trajectory.length; i++) {
    const prev = trajectory[i - 1]
    const curr = trajectory[i]
    
    const valenceChange = Math.abs(curr.valence - prev.valence)
    const arousalChange = Math.abs(curr.arousal - prev.arousal)
    
    if (valenceChange > threshold || arousalChange > threshold) {
      shifts.push({
        time: curr.time,
        type: valenceChange > arousalChange ? 'valence' : 'arousal',
        magnitude: Math.max(valenceChange, arousalChange),
        from: { valence: prev.valence, arousal: prev.arousal },
        to: { valence: curr.valence, arousal: curr.arousal }
      })
    }
  }
  
  return shifts
}

/**
 * Analyze section-level metadata
 */
function analyzeSectionMetadata(section, features, sampleRate = 44100, hopSize = 512) {
  const frameDuration = hopSize / sampleRate
  const startFrame = Math.floor(section.start / frameDuration)
  const endFrame = Math.floor(section.end / frameDuration)
  
  // Extract features for this section
  const sectionFeatures = {
    energy: features.energy?.slice(startFrame, endFrame) || [],
    tempo: features.tempo?.slice(startFrame, endFrame) || [],
    harmony: features.harmony?.slice(startFrame, endFrame) || [],
    melody: features.melody?.slice(startFrame, endFrame) || []
  }
  
  // Calculate section-level psychological descriptors
  const psychological = calculatePsychologicalDescriptors(
    features.danceability?.slice(startFrame, endFrame),
    sectionFeatures.energy,
    sectionFeatures.tempo,
    sampleRate,
    hopSize
  )
  
  // Extract section motifs
  const motifs = extractMotifs(
    sectionFeatures.melody,
    sectionFeatures.harmony,
    1 // Lower threshold for section-level
  )
  
  // Extract section quotes
  const quotes = detectQuotes(
    sectionFeatures.melody,
    sectionFeatures.harmony
  )
  
  // Analyze section story arc
  const storyArc = analyzeStoryArc(
    sectionFeatures.melody,
    sectionFeatures.harmony,
    sampleRate,
    hopSize
  )
  
  return {
    bpm: sectionFeatures.tempo.length > 0 ?
      sectionFeatures.tempo.reduce((sum, t) => sum + (t.bpm || 120), 0) / sectionFeatures.tempo.length : 120,
    key: sectionFeatures.harmony.length > 0 ? 
      inferKey(sectionFeatures.harmony[0]) : 'unknown',
    energy: sectionFeatures.energy.length > 0 ?
      sectionFeatures.energy.reduce((sum, e) => sum + (typeof e === 'object' ? e.value || 0 : e), 0) / sectionFeatures.energy.length : 0.5,
    psychological: psychological,
    motifs: motifs,
    quotes: quotes,
    storyArc: storyArc
  }
}

/**
 * Infer key from harmony
 */
function inferKey(harmony) {
  // Simplified key inference
  if (!harmony || !harmony.chords) return 'unknown'
  // This is a placeholder - real key detection would be more complex
  return 'C major'
}

/**
 * Analyze loop-level metadata
 */
function analyzeLoopMetadata(loop, features, sampleRate = 44100, hopSize = 512) {
  const frameDuration = hopSize / sampleRate
  const startFrame = Math.floor(loop.start / frameDuration)
  const endFrame = Math.floor(loop.end / frameDuration)
  
  // Extract features for this loop
  const loopFeatures = {
    energy: features.energy?.slice(startFrame, endFrame) || [],
    harmony: features.harmony?.slice(startFrame, endFrame) || []
  }
  
  // Calculate loop energy
  const energy = loopFeatures.energy.length > 0 ?
    loopFeatures.energy.reduce((sum, e) => sum + (typeof e === 'object' ? e.value || 0 : e), 0) / loopFeatures.energy.length : 0.5
  
  // Extract loop harmony
  const harmony = loopFeatures.harmony.length > 0 ?
    loopFeatures.harmony.map(h => h.chords?.[0] || 'unknown').filter((v, i, a) => a.indexOf(v) === i) : []
  
  // Calculate loop psychological descriptors
  const psychological = calculatePsychologicalDescriptors(
    features.danceability?.slice(startFrame, endFrame),
    loopFeatures.energy,
    features.tempo?.slice(startFrame, endFrame),
    sampleRate,
    hopSize
  )
  
  return {
    energy: energy,
    harmony: harmony,
    psychological: {
      valence: psychological.overallValence,
      arousal: psychological.overallArousal
    }
  }
}

module.exports = {
  generateLoopPoints,
  detectSongSections,
  extractMotifs,
  detectQuotes,
  analyzeStoryArc,
  calculatePsychologicalDescriptors,
  analyzeSectionMetadata,
  analyzeLoopMetadata
}


