/**
 * Jest test setup for Essentia Audio Analysis
 *
 * Sets up test environment, mocks, and global configurations.
 */

// Mock Essentia.js for testing
jest.mock('essentia.js', () => ({
  Essentia: jest.fn().mockImplementation(() => ({
    FrameGenerator: jest.fn().mockReturnValue({
      size: jest.fn().mockReturnValue(100),
      get: jest.fn().mockReturnValue(new Float32Array(2048))
    }),
    Windowing: jest.fn().mockReturnValue({
      frame: new Float32Array(2048)
    }),
    Spectrum: jest.fn().mockReturnValue({
      spectrum: new Float32Array(1024)
    }),
    PitchYinFFT: jest.fn().mockReturnValue(440), // A4 note
    DCT: jest.fn().mockReturnValue({
      dct: new Float32Array(1024)
    }),
    FrameCutter: jest.fn().mockReturnValue({
      frame: new Float32Array(2048)
    }),
    Envelope: jest.fn().mockReturnValue({
      signal: new Float32Array(2048)
    }),
    BarkBands: jest.fn().mockReturnValue({
      bands: new Float32Array(27)
    }),
    MelBands: jest.fn().mockReturnValue({
      bands: new Float32Array(40)
    }),
    ERBBands: jest.fn().mockReturnValue({
      bands: new Float32Array(40)
    }),
    MFCC: jest.fn().mockReturnValue({
      bands: new Float32Array(40),
      mfcc: new Float32Array(13)
    }),
    GFCC: jest.fn().mockReturnValue({
      gfcc: new Float32Array(13)
    }),
    LPC: jest.fn().mockReturnValue({
      lpc: new Float32Array(10),
      reflection: new Float32Array(10)
    }),
    SpectralPeaks: jest.fn().mockReturnValue({
      frequencies: new Float32Array([100, 200, 300]),
      magnitudes: new Float32Array([0.5, 0.3, 0.2])
    }),
    DynamicComplexity: jest.fn().mockReturnValue(0.7),
    RollOff: jest.fn().mockReturnValue({
      rollOff: 8000
    }),
    HFC: jest.fn().mockReturnValue({
      hfc: 0.6
    }),
    PitchSalience: jest.fn().mockReturnValue({
      pitchSalience: 0.8
    }),
    PredominantPitchMelodia: jest.fn().mockReturnValue({
      pitch: new Float32Array([440, 440, 440]),
      pitchConfidence: new Float32Array([0.9, 0.9, 0.9])
    }),
    KeyExtractor: jest.fn().mockReturnValue({
      key: 'C major'
    }),
    Scale: jest.fn().mockReturnValue({
      signal: new Float32Array([1, 1, 1])
    }),
    TuningFrequencyExtractor: jest.fn().mockReturnValue({
      tuningFrequency: new Float32Array([440])
    }),
    BpmHistogramDescriptors: jest.fn().mockReturnValue({
      bpm: 120,
      histogram: new Float32Array(120)
    }),
    OnsetDetectionGlobal: jest.fn().mockReturnValue({
      onsetDetections: new Float32Array([0.1, 0.2, 0.3])
    }),
    Danceability: jest.fn().mockReturnValue({
      dfa: new Float32Array([0.6, 0.7, 0.8]),
      value: 0.7
    }),
    Loudness: jest.fn().mockReturnValue(0.8),
    ZeroCrossingRate: jest.fn().mockReturnValue(0.05),
    TempoTapDegara: jest.fn().mockReturnValue({
      ticks: new Float32Array([0, 0.5, 1.0, 1.5])
    }),
    SpectralContrast: jest.fn().mockReturnValue({
      spectralContrast: new Float32Array(6),
      spectralValley: new Float32Array(6)
    }),
    HarmonicPeaks: jest.fn().mockReturnValue({
      harmonicFrequencies: new Float32Array([440, 880]),
      harmonicMagnitudes: new Float32Array([0.8, 0.4])
    }),
    Inharmonicity: jest.fn().mockReturnValue(0.02),
    Dissonance: jest.fn().mockReturnValue(0.1),
    RhythmTransform: jest.fn().mockReturnValue({
      rhythm: new Float32Array(12)
    }),
    vectorToArray: jest.fn().mockImplementation((vector) => Array.from(vector)),
    arrayToVector: jest.fn().mockImplementation((array) => new Float32Array(array)),
    delete: jest.fn(),
    module: {
      VectorVectorFloat: jest.fn().mockImplementation(() => ({
        push_back: jest.fn(),
        size: jest.fn().mockReturnValue(1)
      }))
    }
  })),
  EssentiaWASM: 'mock-wasm'
}));

// Mock Cloudflare Workers global
global.fetch = jest.fn();
global.Response = jest.fn().mockImplementation((body, options) => ({
  json: () => Promise.resolve(JSON.parse(body)),
  text: () => Promise.resolve(body),
  ok: true,
  status: 200,
  headers: new Map()
}));

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

// Set up test environment variables
process.env.FRAME_SAMPLE_RATE = '5';
process.env.WORKER_ENV = 'test';

// Global test utilities
global.createMockAudioData = (frames = 10) => {
  return Array.from({ length: frames }, (_, i) => ({
    pitch: [440 + i * 10, 442 + i * 10, 438 + i * 10],
    pitchConfidence: [0.9, 0.8, 0.7],
    mfcc: Array.from({ length: 13 }, () => Math.random() * 2 - 1),
    bpm: 120 + i * 2,
    dfa: [0.6 + i * 0.05, 0.7 + i * 0.03],
    chords: ['C', 'Am', 'F', 'G'][i % 4]
  }));
};

global.createMockFeatures = () => ({
  energy: Array.from({ length: 20 }, () => Math.random()),
  tempo: Array.from({ length: 20 }, () => ({ bpm: 120 + Math.random() * 20 })),
  harmony: Array.from({ length: 20 }, () => ({ chords: ['C', 'Am', 'F', 'G'] })),
  timbre: Array.from({ length: 20 }, () => ({ mfcc: Array.from({ length: 13 }, () => Math.random() * 2 - 1) })),
  melody: Array.from({ length: 20 }, () => ({
    pitch: [440, 442, 438],
    pitchConfidence: [0.9, 0.8, 0.7]
  })),
  danceability: Array.from({ length: 20 }, () => ({
    dfa: [0.6, 0.7],
    value: 0.65
  }))
});

// Console spy for testing
global.consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {})
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  global.consoleSpy.log.mockClear();
  global.consoleSpy.error.mockClear();
  global.consoleSpy.warn.mockClear();
});
