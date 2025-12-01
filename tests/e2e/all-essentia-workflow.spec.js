/**
 * All Essentia Full Analysis Workflow E2E Tests
 *
 * Tests the comprehensive audio analysis workflow using all Essentia.js capabilities:
 * - Complete spectral analysis (FFT, DCT, spectral features)
 * - Full frequency band analysis (Bark, Mel, ERB bands)
 * - Comprehensive cepstral analysis (MFCC, GFCC)
 * - Complete pitch and tonal analysis
 * - Full rhythm and tempo analysis
 * - Extensive harmonic analysis (HPCP, chords, dissonance)
 * - All high-level descriptors
 * - Beat detection and analysis
 * - Song section detection
 * - Loop generation
 * - Songwriting metadata (motifs, quotes, psychological analysis)
 * - Story arc analysis
 * - Hierarchical metadata (section/loop level)
 *
 * This is the most comprehensive audio analysis workflow available.
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test configuration
const CONFIG = {
  baseUrl: 'https://essentia.yourdomain.workers.dev',
  pow3rPassUrl: 'https://config.superbots.link/pass',
  workflowOrchestratorUrl: 'https://config.superbots.link/mcp/workflow',
  testAudioFile: join(__dirname, '../../docs/No Its Not.mp3'),
  allEssentiaWorkflow: join(__dirname, 'all-essentia-workflow.yml'),
  timeout: 600000, // 10 minutes for full analysis
};

// Load all essentia workflow definition
let ALL_ESSENTIA_WORKFLOW;
try {
  ALL_ESSENTIA_WORKFLOW = readFileSync(CONFIG.allEssentiaWorkflow, 'utf8');
} catch (error) {
  console.warn('Could not load all essentia workflow definition:', error);
}

test.describe('All Essentia Full Analysis Workflow', () => {
  let pow3rPassToken = null;
  let workflowId = null;
  let executionId = null;
  let resultFileId = null;

  test.beforeAll(async () => {
    pow3rPassToken = await setupPow3rPassAuthentication();
    expect(pow3rPassToken).toBeTruthy();
  });

  test('All Essentia Workflow - Definition Validation', async ({ request }) => {
    expect(ALL_ESSENTIA_WORKFLOW).toBeTruthy();

    const workflowDefinition = {
      name: 'all-essentia-analysis-test',
      description: 'Test complete Essentia analysis workflow',
      template: ALL_ESSENTIA_WORKFLOW,
      parameters: {
        fileUrl: 'https://example.com/test-audio.mp3',
        analysisType: 'full',
        includeMetadata: true,
        frameSampleRate: 5,
        timeout: 300000
      }
    };

    const response = await request.post(`${CONFIG.workflowOrchestratorUrl}/workflows/validate`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      },
      data: workflowDefinition
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.valid).toBe(true);
    expect(data.stepCount).toBe(19); // Full workflow has 19 steps
  });

  test('All Essentia Workflow - Creation and Execution', async ({ request }) => {
    const workflowConfig = {
      name: `full-analysis-${Date.now()}`,
      description: 'E2E test of complete Essentia audio analysis workflow',
      template: ALL_ESSENTIA_WORKFLOW,
      parameters: {
        fileUrl: await uploadTestFile(),
        analysisType: 'full',
        includeMetadata: true,
        frameSampleRate: 5,
        timeout: 300000
      },
      tags: ['e2e', 'full-analysis', 'comprehensive'],
      priority: 'high'
    };

    // Create workflow
    const createResponse = await request.post(`${CONFIG.workflowOrchestratorUrl}/workflows`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      },
      data: workflowConfig
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    expect(createData.success).toBe(true);
    workflowId = createData.workflow.id;

    // Execute workflow
    const execResponse = await request.post(`${CONFIG.workflowOrchestratorUrl}/executions`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        workflowId: workflowId,
        mode: 'async'
      }
    });

    expect(execResponse.ok()).toBeTruthy();
    const execData = await execResponse.json();
    expect(execData.success).toBe(true);
    executionId = execData.execution.id;
  });

  test('All Essentia Workflow - Execution Monitoring', async ({ request }) => {
    expect(executionId).toBeTruthy();

    let executionComplete = false;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes

    while (!executionComplete && attempts < maxAttempts) {
      const response = await request.get(`${CONFIG.workflowOrchestratorUrl}/executions/${executionId}`, {
        headers: {
          'Authorization': `Bearer ${pow3rPassToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      const status = data.execution.status;
      expect(['created', 'queued', 'running', 'completed', 'failed']).toContain(status);

      if (status === 'completed') {
        executionComplete = true;
        expect(data.execution.result).toBeTruthy();
        expect(data.execution.result.fileId).toBeTruthy();
        resultFileId = data.execution.result.fileId;
      } else if (status === 'failed') {
        throw new Error(`Full analysis workflow execution failed: ${data.execution.error?.message}`);
      }

      if (!executionComplete) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }
    }

    expect(executionComplete).toBe(true);
  });

  test('All Essentia Workflow - Spectral Analysis Results', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}?type=spectral`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const spectralData = data.result;
    expect(spectralData).toHaveProperty('fft');
    expect(spectralData).toHaveProperty('dct');
    expect(spectralData).toHaveProperty('rolloff');
    expect(spectralData).toHaveProperty('complexity');
    expect(spectralData).toHaveProperty('contrast');
    expect(Array.isArray(spectralData.fft)).toBe(true);
    expect(spectralData.fft.length).toBeGreaterThan(0);
  });

  test('All Essentia Workflow - Frequency Band Analysis Results', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}?type=frequencyBands`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const bandData = data.result;
    expect(bandData).toHaveProperty('barkBands');
    expect(bandData).toHaveProperty('melBands');
    expect(bandData).toHaveProperty('erbBands');
    expect(Array.isArray(bandData.barkBands)).toBe(true);
    expect(Array.isArray(bandData.melBands)).toBe(true);
    expect(Array.isArray(bandData.erbBands)).toBe(true);
  });

  test('All Essentia Workflow - Cepstral Analysis Results', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}?type=cepstral`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const cepstralData = data.result;
    expect(cepstralData).toHaveProperty('mfcc');
    expect(cepstralData).toHaveProperty('gfcc');
    expect(Array.isArray(cepstralData.mfcc)).toBe(true);
    expect(Array.isArray(cepstralData.gfcc)).toBe(true);
    expect(cepstralData.mfcc[0]).toHaveProperty('bands');
    expect(cepstralData.mfcc[0]).toHaveProperty('mfcc');
  });

  test('All Essentia Workflow - Pitch and Tonal Analysis Results', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}?type=pitchTonal`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const tonalData = data.result;
    expect(tonalData).toHaveProperty('pitchMelody');
    expect(tonalData).toHaveProperty('key');
    expect(tonalData).toHaveProperty('scale');
    expect(tonalData).toHaveProperty('tuningFrequency');
    expect(Array.isArray(tonalData.pitchMelody)).toBe(true);
  });

  test('All Essentia Workflow - Rhythm and Tempo Analysis Results', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}?type=rhythm`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const rhythmData = data.result;
    expect(rhythmData).toHaveProperty('bpm');
    expect(rhythmData).toHaveProperty('beats');
    expect(rhythmData).toHaveProperty('onsetStrength');
    expect(rhythmData).toHaveProperty('tempoConfidence');
    expect(Array.isArray(rhythmData.beats)).toBe(true);
  });

  test('All Essentia Workflow - Harmonic Analysis Results', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}?type=harmonic`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const harmonicData = data.result;
    expect(harmonicData).toHaveProperty('chords');
    expect(harmonicData).toHaveProperty('hpcp');
    expect(harmonicData).toHaveProperty('dissonance');
    expect(harmonicData).toHaveProperty('inharmonicity');
    expect(Array.isArray(harmonicData.chords)).toBe(true);
  });

  test('All Essentia Workflow - High-Level Descriptors Results', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}?type=highLevel`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const highLevelData = data.result;
    expect(highLevelData).toHaveProperty('danceability');
    expect(highLevelData).toHaveProperty('dynamicComplexity');
    expect(highLevelData).toHaveProperty('loudness');
    expect(highLevelData.danceability).toHaveProperty('dfa');
    expect(highLevelData.danceability).toHaveProperty('value');
  });

  test('All Essentia Workflow - Songwriting Metadata Results', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}?type=songwriting`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const songwritingData = data.result;
    expect(songwritingData).toHaveProperty('motifs');
    expect(songwritingData).toHaveProperty('psychological');
    expect(songwritingData).toHaveProperty('storyArc');

    // Psychological analysis
    expect(songwritingData.psychological).toHaveProperty('overallValence');
    expect(songwritingData.psychological).toHaveProperty('overallArousal');
    expect(songwritingData.psychological).toHaveProperty('emotionalTrajectory');

    // Story arc
    expect(songwritingData.storyArc).toHaveProperty('tension');
    expect(songwritingData.storyArc).toHaveProperty('release');
    expect(songwritingData.storyArc).toHaveProperty('narrativeStructure');
  });

  test('All Essentia Workflow - Hierarchical Metadata Results', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}?type=hierarchical`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const hierarchicalData = data.result;
    expect(hierarchicalData).toHaveProperty('sections');
    expect(hierarchicalData).toHaveProperty('loops');

    // Section metadata
    expect(Array.isArray(hierarchicalData.sections)).toBe(true);
    if (hierarchicalData.sections.length > 0) {
      const section = hierarchicalData.sections[0];
      expect(section).toHaveProperty('type');
      expect(section).toHaveProperty('start');
      expect(section).toHaveProperty('end');
      expect(section).toHaveProperty('metadata');
    }

    // Loop metadata
    expect(Array.isArray(hierarchicalData.loops)).toBe(true);
    if (hierarchicalData.loops.length > 0) {
      const loop = hierarchicalData.loops[0];
      expect(loop).toHaveProperty('id');
      expect(loop).toHaveProperty('start');
      expect(loop).toHaveProperty('end');
      expect(loop).toHaveProperty('metadata');
    }
  });

  test('All Essentia Workflow - Performance Validation', async ({ request }) => {
    expect(executionId).toBeTruthy();

    const response = await request.get(`${CONFIG.workflowOrchestratorUrl}/executions/${executionId}/metrics`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Full analysis should complete within reasonable time
    expect(data.metrics.totalDuration).toBeLessThan(600000); // Under 10 minutes
    expect(data.metrics.stepCount).toBe(19); // Full workflow has 19 steps

    // Validate step performance
    const stepDurations = data.metrics.stepDurations;

    // Spectral analysis should be fast
    expect(stepDurations['spectral-analysis']).toBeLessThan(40000);
    expect(stepDurations['frequency-band-analysis']).toBeLessThan(40000);
    expect(stepDurations['cepstral-analysis']).toBeLessThan(40000);

    // Complex analysis takes longer
    expect(stepDurations['pitch-tonal-analysis']).toBeLessThan(50000);
    expect(stepDurations['harmonic-analysis']).toBeLessThan(50000);
    expect(stepDurations['rhythm-analysis']).toBeLessThan(70000);

    // Metadata analysis
    expect(stepDurations['motif-analysis']).toBeLessThan(50000);
    expect(stepDurations['psychological-analysis']).toBeLessThan(35000);
  });

  test('All Essentia Workflow - Comprehensive Output Validation', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/results/${resultFileId}/summary`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Validate comprehensive summary structure
    const summary = data.result.summary;
    expect(summary).toHaveProperty('duration');
    expect(summary).toHaveProperty('sampleRate');
    expect(summary).toHaveProperty('channels');
    expect(summary).toHaveProperty('key');
    expect(summary).toHaveProperty('bpm');
    expect(summary).toHaveProperty('totalBeats');
    expect(summary).toHaveProperty('sections');
    expect(summary).toHaveProperty('loopPoints');
    expect(summary).toHaveProperty('motifs');
    expect(summary).toHaveProperty('processingTime');

    // Full analysis should have more comprehensive results
    expect(Object.keys(summary)).toHaveLength(10);
  });

  test.afterAll(async () => {
    // Cleanup test resources
    if (resultFileId) {
      try {
        await fetch(`${CONFIG.baseUrl}/files/${resultFileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${pow3rPassToken}`
          }
        });
      } catch (error) {
        console.warn(`File cleanup failed:`, error);
      }
    }

    if (executionId) {
      try {
        await fetch(`${CONFIG.workflowOrchestratorUrl}/executions/${executionId}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${pow3rPassToken}`
          }
        });
      } catch (error) {
        console.warn(`Execution cleanup failed:`, error);
      }
    }
  });
});

/**
 * Setup Pow3r Pass authentication
 */
async function setupPow3rPassAuthentication() {
  if (process.env.CI) {
    const response = await fetch(`${CONFIG.pow3rPassUrl}/credentials/essentia`, {
      headers: {
        'Authorization': `Bearer ${process.env.POW3R_PASS_MASTER_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get Pow3r Pass token');
    }

    const data = await response.json();
    return data.data.value;
  } else {
    return process.env.POW3R_PASS_TOKEN || 'test-full-analysis-token';
  }
}

/**
 * Upload test audio file
 */
async function uploadTestFile() {
  return 'https://example.com/test-audio.mp3';
}




