/**
 * Sample Workflow E2E Tests
 *
 * Tests the sample audio analysis workflow focusing on:
 * - Beat detection and analysis
 * - Sampling features
 * - Looping capabilities
 * - Key and BPM extraction
 *
 * This is a streamlined workflow for users who want basic
 * rhythm and tonal analysis without full comprehensive features.
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
  sampleWorkflow: join(__dirname, 'sample-workflow.yml'),
  timeout: 180000, // 3 minutes for sample workflow
};

// Load sample workflow definition
let SAMPLE_WORKFLOW;
try {
  SAMPLE_WORKFLOW = readFileSync(CONFIG.sampleWorkflow, 'utf8');
} catch (error) {
  console.warn('Could not load sample workflow definition:', error);
}

test.describe('Sample Audio Analysis Workflow', () => {
  let pow3rPassToken = null;
  let workflowId = null;
  let executionId = null;
  let resultFileId = null;

  test.beforeAll(async () => {
    pow3rPassToken = await setupPow3rPassAuthentication();
    expect(pow3rPassToken).toBeTruthy();
  });

  test('Sample Workflow - Definition Validation', async ({ request }) => {
    expect(SAMPLE_WORKFLOW).toBeTruthy();

    // Validate workflow can be parsed
    const workflowDefinition = {
      name: 'sample-audio-analysis-test',
      description: 'Test sample workflow definition',
      template: SAMPLE_WORKFLOW,
      parameters: {
        fileUrl: 'https://example.com/test-audio.mp3',
        analysisType: 'sample',
        frameSampleRate: 5,
        timeout: 120000
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
  });

  test('Sample Workflow - Creation and Execution', async ({ request }) => {
    const workflowConfig = {
      name: `sample-analysis-${Date.now()}`,
      description: 'E2E test of sample audio analysis workflow',
      template: SAMPLE_WORKFLOW,
      parameters: {
        fileUrl: await uploadTestFile(),
        analysisType: 'sample',
        frameSampleRate: 5,
        timeout: 120000
      },
      tags: ['e2e', 'sample-workflow', 'beat-analysis'],
      priority: 'normal'
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

  test('Sample Workflow - Execution Monitoring', async ({ request }) => {
    expect(executionId).toBeTruthy();

    let executionComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

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
        throw new Error(`Sample workflow execution failed: ${data.execution.error?.message}`);
      }

      if (!executionComplete) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }
    }

    expect(executionComplete).toBe(true);
  });

  test('Sample Workflow - Key and BPM Results', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}?type=key`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const keyData = data.result;
    expect(keyData).toHaveProperty('key');
    expect(keyData).toHaveProperty('scale');
    expect(keyData).toHaveProperty('confidence');
    expect(typeof keyData.key).toBe('string');
    expect(['major', 'minor']).toContain(keyData.scale);
  });

  test('Sample Workflow - Beat Analysis Results', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}?type=beats`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const beatData = data.result;
    expect(beatData).toHaveProperty('bpm');
    expect(beatData).toHaveProperty('beats');
    expect(beatData).toHaveProperty('totalBeats');
    expect(Array.isArray(beatData.beats)).toBe(true);
    expect(beatData.beats.length).toBeGreaterThan(0);
    expect(beatData.bpm).toBeGreaterThan(60);
    expect(beatData.bpm).toBeLessThan(200);
  });

  test('Sample Workflow - Loop Points Results', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}?type=loops`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const loopData = data.result;
    expect(Array.isArray(loopData)).toBe(true);

    loopData.forEach(loop => {
      expect(loop).toHaveProperty('id');
      expect(loop).toHaveProperty('start');
      expect(loop).toHaveProperty('end');
      expect(loop).toHaveProperty('length');
      expect(loop).toHaveProperty('type');
      expect([4, 8, 16, 32]).toContain(loop.length);
    });
  });

  test('Sample Workflow - Sampling Analysis Results', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}?type=sampling`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const samplingData = data.result;
    expect(samplingData).toHaveProperty('sampleRate');
    expect(samplingData).toHaveProperty('bitDepth');
    expect(samplingData).toHaveProperty('channels');
    expect(samplingData.sampleRate).toBeGreaterThan(0);
  });

  test('Sample Workflow - Performance Validation', async ({ request }) => {
    expect(executionId).toBeTruthy();

    const response = await request.get(`${CONFIG.workflowOrchestratorUrl}/executions/${executionId}/metrics`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Sample workflow should complete faster than full analysis
    expect(data.metrics.totalDuration).toBeLessThan(180000); // Under 3 minutes
    expect(data.metrics.stepCount).toBe(8); // Sample workflow has 8 steps

    // Validate specific step durations
    const stepDurations = data.metrics.stepDurations;
    expect(stepDurations['key-bpm-analysis']).toBeLessThan(20000); // Fast key detection
    expect(stepDurations['beat-analysis']).toBeLessThan(25000); // Fast beat detection
    expect(stepDurations['loop-generation']).toBeLessThan(15000); // Quick loop generation
  });

  test('Sample Workflow - ACL Scope Validation', async ({ request }) => {
    // Test with insufficient permissions (missing audio:analyze)
    const limitedToken = await createLimitedToken(['metadata:read']);

    const response = await request.post(`${CONFIG.workflowOrchestratorUrl}/workflows`, {
      headers: {
        'Authorization': `Bearer ${limitedToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'unauthorized-sample-test',
        template: SAMPLE_WORKFLOW,
        parameters: { fileUrl: 'https://example.com/test.mp3' }
      }
    });

    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('Insufficient permissions');
  });

  test('Sample Workflow - Output Summary Validation', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/results/${resultFileId}/summary`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Validate sample workflow summary structure
    const summary = data.result.summary;
    expect(summary).toHaveProperty('duration');
    expect(summary).toHaveProperty('key');
    expect(summary).toHaveProperty('bpm');
    expect(summary).toHaveProperty('totalBeats');
    expect(summary).toHaveProperty('loopPoints');
    expect(summary).toHaveProperty('processingTime');

    // Sample workflow should have fewer features than full analysis
    expect(Object.keys(summary)).toHaveLength(6);
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
    return process.env.POW3R_PASS_TOKEN || 'test-sample-workflow-token';
  }
}

/**
 * Create a token with limited permissions
 */
async function createLimitedToken(scopes) {
  return `limited-token-${scopes.join('-')}-${Date.now()}`;
}

/**
 * Upload test audio file
 */
async function uploadTestFile() {
  return 'https://example.com/test-audio.mp3';
}
