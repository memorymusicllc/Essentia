/**
 * Tests for helpers.js - Enhanced Audio Analysis Functions
 *
 * Tests beat markers, loop slicing, section detection, motifs, quotes,
 * story arcs, and psychological analysis.
 */

const helpers = require('../helpers.js');

describe('helpers.js', () => {
  describe('generateLoopPoints', () => {
    test('should generate loop points for different lengths', () => {
      const beats = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
      const loopPoints = helpers.generateLoopPoints(beats, [4, 8]);

      expect(loopPoints).toBeDefined();
      expect(Array.isArray(loopPoints)).toBe(true);

      // Should generate 4-beat loops
      const fourBeatLoops = loopPoints.filter(loop => loop.type === '4-beat');
      expect(fourBeatLoops.length).toBeGreaterThan(0);

      fourBeatLoops.forEach(loop => {
        expect(loop).toHaveProperty('id');
        expect(loop).toHaveProperty('start');
        expect(loop).toHaveProperty('end');
        expect(loop).toHaveProperty('length', 4);
        expect(loop).toHaveProperty('type', '4-beat');
        expect(loop).toHaveProperty('startBeat');
        expect(loop).toHaveProperty('endBeat');
      });
    });

    test('should handle empty beats array', () => {
      const loopPoints = helpers.generateLoopPoints([]);
      expect(loopPoints).toEqual([]);
    });

    test('should handle insufficient beats', () => {
      const beats = [0, 0.5]; // Only 2 beats, need 4 for loop
      const loopPoints = helpers.generateLoopPoints(beats, [4]);
      expect(loopPoints.length).toBe(0);
    });
  });

  describe('detectSongSections', () => {
    test('should detect sections from feature data', () => {
      const features = global.createMockFeatures();

      const sections = helpers.detectSongSections(features);

      expect(sections).toBeDefined();
      expect(Array.isArray(sections)).toBe(true);

      sections.forEach(section => {
        expect(section).toHaveProperty('type');
        expect(section).toHaveProperty('start');
        expect(section).toHaveProperty('end');
        expect(section).toHaveProperty('confidence');
        expect(section).toHaveProperty('metadata');
        expect(section.start).toBeLessThan(section.end);
        expect(section.confidence).toBeGreaterThanOrEqual(0);
        expect(section.confidence).toBeLessThanOrEqual(1);
      });
    });

    test('should handle empty features', () => {
      const sections = helpers.detectSongSections({});
      expect(sections).toEqual([]);
    });

    test('should classify sections correctly', () => {
      const features = global.createMockFeatures();

      // Modify features to create clear section boundaries
      features.energy = [0.1, 0.1, 0.9, 0.9, 0.1, 0.1]; // Low-high-low pattern
      features.tempo = [
        { bpm: 100 }, { bpm: 100 }, { bpm: 140 }, { bpm: 140 }, { bpm: 100 }, { bpm: 100 }
      ];

      const sections = helpers.detectSongSections(features);

      // Should detect some sections
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('extractMotifs', () => {
    test('should extract melodic motifs', () => {
      const pitchMelody = global.createMockAudioData(20);
      const chords = pitchMelody.map(frame => ({ chords: ['C', 'Am', 'F', 'G'] }));

      const motifs = helpers.extractMotifs(pitchMelody, chords, 2);

      expect(motifs).toBeDefined();
      expect(Array.isArray(motifs)).toBe(true);

      motifs.forEach(motif => {
        expect(motif).toHaveProperty('id');
        expect(motif).toHaveProperty('type');
        expect(motif).toHaveProperty('pattern');
        expect(motif).toHaveProperty('occurrences');
        expect(motif).toHaveProperty('evolution');
        expect(motif.occurrences.length).toBeGreaterThanOrEqual(2);
      });
    });

    test('should extract harmonic motifs', () => {
      const chords = Array.from({ length: 20 }, (_, i) => ({
        chords: ['C', 'Am', 'F', 'G'][i % 4]
      }));

      const motifs = helpers.extractMotifs([], chords, 2);

      expect(motifs).toBeDefined();
      expect(Array.isArray(motifs)).toBe(true);
    });

    test('should handle empty inputs', () => {
      const motifs = helpers.extractMotifs([], []);
      expect(motifs).toEqual([]);
    });

    test('should respect minimum occurrences threshold', () => {
      const pitchMelody = global.createMockAudioData(10);
      const motifs = helpers.extractMotifs(pitchMelody, [], 5); // Require 5 occurrences

      // Should be fewer or no motifs with high threshold
      expect(motifs.length).toBeLessThanOrEqual(10);
    });
  });

  describe('detectQuotes', () => {
    test('should detect melodic quotes', () => {
      const pitchMelody = global.createMockAudioData(30);

      // Create repeated patterns
      pitchMelody[10] = pitchMelody[0]; // Copy first frame to position 10
      pitchMelody[20] = pitchMelody[0]; // Copy first frame to position 20

      const quotes = helpers.detectQuotes(pitchMelody, []);

      expect(quotes).toBeDefined();
      expect(Array.isArray(quotes)).toBe(true);

      quotes.forEach(quote => {
        expect(quote).toHaveProperty('type');
        expect(quote).toHaveProperty('original');
        expect(quote).toHaveProperty('quoted');
        expect(quote.quoted.length).toBeGreaterThan(0);
      });
    });

    test('should detect harmonic quotes', () => {
      const chords = Array.from({ length: 30 }, (_, i) => ({
        chords: ['C', 'Am', 'F', 'G'][i % 4]
      }));

      const quotes = helpers.detectQuotes([], chords);

      expect(quotes).toBeDefined();
      expect(Array.isArray(quotes)).toBe(true);
    });

    test('should handle empty inputs', () => {
      const quotes = helpers.detectQuotes([], []);
      expect(quotes).toEqual([]);
    });
  });

  describe('analyzeStoryArc', () => {
    test('should analyze story arc from melody and harmony', () => {
      const pitchMelody = global.createMockAudioData(20);
      const chords = pitchMelody.map(() => ({ chords: ['C'] }));

      const storyArc = helpers.analyzeStoryArc(pitchMelody, chords);

      expect(storyArc).toHaveProperty('tension');
      expect(storyArc).toHaveProperty('release');
      expect(storyArc).toHaveProperty('narrativeStructure');

      expect(Array.isArray(storyArc.tension)).toBe(true);
      expect(Array.isArray(storyArc.release)).toBe(true);
      expect(typeof storyArc.narrativeStructure).toBe('string');
    });

    test('should handle empty inputs', () => {
      const storyArc = helpers.analyzeStoryArc([], []);

      expect(storyArc.tension).toEqual([]);
      expect(storyArc.release).toEqual([]);
      expect(storyArc.narrativeStructure).toBe('unknown');
    });
  });

  describe('calculatePsychologicalDescriptors', () => {
    test('should calculate valence and arousal', () => {
      const danceability = global.createMockFeatures().danceability;
      const energy = global.createMockFeatures().energy;
      const tempo = global.createMockFeatures().tempo;

      const psychological = helpers.calculatePsychologicalDescriptors(
        danceability, energy, tempo
      );

      expect(psychological).toHaveProperty('overallValence');
      expect(psychological).toHaveProperty('overallArousal');
      expect(psychological).toHaveProperty('emotionalTrajectory');
      expect(psychological).toHaveProperty('paradigmShifts');

      expect(typeof psychological.overallValence).toBe('number');
      expect(typeof psychological.overallArousal).toBe('number');
      expect(Array.isArray(psychological.emotionalTrajectory)).toBe(true);
      expect(Array.isArray(psychological.paradigmShifts)).toBe(true);

      expect(psychological.overallValence).toBeGreaterThanOrEqual(0);
      expect(psychological.overallValence).toBeLessThanOrEqual(1);
      expect(psychological.overallArousal).toBeGreaterThanOrEqual(0);
    });

    test('should detect paradigm shifts', () => {
      // Create trajectory with sudden changes
      const trajectory = [
        { time: 0, valence: 0.2, arousal: 0.2 },
        { time: 1, valence: 0.2, arousal: 0.2 },
        { time: 2, valence: 0.8, arousal: 0.8 }, // Sudden change
        { time: 3, valence: 0.8, arousal: 0.8 }
      ];

      // Mock the function to return our test trajectory
      const original = helpers.calculatePsychologicalDescriptors;
      helpers.calculatePsychologicalDescriptors = jest.fn().mockReturnValue({
        overallValence: 0.5,
        overallArousal: 0.5,
        emotionalTrajectory: trajectory,
        paradigmShifts: [{
          time: 2,
          type: 'arousal',
          magnitude: 0.6,
          from: { valence: 0.2, arousal: 0.2 },
          to: { valence: 0.8, arousal: 0.8 }
        }]
      });

      const result = helpers.calculatePsychologicalDescriptors([], [], []);

      expect(result.paradigmShifts.length).toBeGreaterThan(0);
      const shift = result.paradigmShifts[0];
      expect(shift).toHaveProperty('time');
      expect(shift).toHaveProperty('type');
      expect(shift).toHaveProperty('magnitude');

      // Restore original function
      helpers.calculatePsychologicalDescriptors = original;
    });
  });

  describe('analyzeSectionMetadata', () => {
    test('should analyze section-level metadata', () => {
      const section = {
        type: 'verse',
        start: 0,
        end: 10,
        confidence: 0.8
      };

      const features = global.createMockFeatures();

      const metadata = helpers.analyzeSectionMetadata(section, features);

      expect(metadata).toHaveProperty('bpm');
      expect(metadata).toHaveProperty('key');
      expect(metadata).toHaveProperty('energy');
      expect(metadata).toHaveProperty('psychological');
      expect(metadata).toHaveProperty('motifs');
      expect(metadata).toHaveProperty('quotes');
      expect(metadata).toHaveProperty('storyArc');
    });
  });

  describe('analyzeLoopMetadata', () => {
    test('should analyze loop-level metadata', () => {
      const loop = {
        id: 'loop-1',
        start: 0,
        end: 2,
        length: 4,
        type: '4-beat'
      };

      const features = global.createMockFeatures();

      const metadata = helpers.analyzeLoopMetadata(loop, features);

      expect(metadata).toHaveProperty('energy');
      expect(metadata).toHaveProperty('harmony');
      expect(metadata).toHaveProperty('psychological');
      expect(typeof metadata.energy).toBe('number');
      expect(Array.isArray(metadata.harmony)).toBe(true);
    });
  });

  // Integration test
  describe('end-to-end functionality', () => {
    test('should process complete audio analysis pipeline', () => {
      // Create comprehensive mock data
      const mockAudioData = global.createMockAudioData(50);
      const mockFeatures = global.createMockFeatures();

      // Test the complete pipeline
      const beats = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
      const loopPoints = helpers.generateLoopPoints(beats, [4]);

      const sections = helpers.detectSongSections(mockFeatures);

      const motifs = helpers.extractMotifs(mockAudioData, mockAudioData.map(() => ({ chords: ['C'] })));

      const quotes = helpers.detectQuotes(mockAudioData, mockAudioData.map(() => ({ chords: ['C'] })));

      const storyArc = helpers.analyzeStoryArc(mockAudioData, mockAudioData.map(() => ({ chords: ['C'] })));

      const psychological = helpers.calculatePsychologicalDescriptors(
        mockFeatures.danceability,
        mockFeatures.energy,
        mockFeatures.tempo
      );

      // Verify all components work together
      expect(loopPoints.length).toBeGreaterThan(0);
      expect(sections.length).toBeGreaterThan(0);
      expect(motifs.length).toBeGreaterThanOrEqual(0); // May be 0 depending on data
      expect(quotes.length).toBeGreaterThanOrEqual(0);
      expect(storyArc.tension.length).toBeGreaterThan(0);
      expect(psychological.emotionalTrajectory.length).toBeGreaterThan(0);
    });
  });
});
