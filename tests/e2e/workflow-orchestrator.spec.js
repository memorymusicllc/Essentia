/**
 * Pow3r Workflow Orchestrator E2E Tests for Essentia
 *
 * Tests the execution of audio analysis workflows on Cloudflare Edge
 * using the Pow3r Workflow Orchestrator with Pow3r Pass authentication.
 *
 * @module workflow-orchestrator-e2e
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

// Test configuration
const CONFIG = {
  baseUrl: 'https://essentia.yourdomain.workers.dev',
  pow3rPassUrl: 'https://config.superbots.link/pass',
  workflowOrchestratorUrl: 'https://config.superbots.link/mcp/workflow',
  testAudioFile: join(__dirname, '../../docs/No Its Not.mp3'),
  workflowDefinition: join(__dirname, 'audio-analysis-workflow.yml'),
  timeout: 600000, // 10 minutes for workflow execution
};

// Load workflow definition
let WORKFLOW_DEFINITION;
try {
  WORKFLOW_DEFINITION = yaml.load(readFileSync(CONFIG.workflowDefinition, 'utf8'));
} catch (error) {
  console.warn('Could not load workflow definition:', error);
  WORKFLOW_DEFINITION = null;
}

test.describe('Pow3r Workflow Orchestrator - Essentia Audio Analysis', () => {
  let pow3rPassToken = null;
  let workflowId = null;
  let executionId = null;
  let resultFileId = null;

  test.beforeAll(async () => {
    // Setup Pow3r Pass authentication
    pow3rPassToken = await setupPow3rPassAuthentication();
    expect(pow3rPassToken).toBeTruthy();
  });

  test('Workflow Orchestrator - Service Health Check', async ({ request }) => {
    const response = await request.get(`${CONFIG.workflowOrchestratorUrl}/health`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.services).toContain('workflow-orchestrator');
  });

  test('Workflow Orchestrator - Pow3r Pass Authentication', async ({ request }) => {
    const response = await request.post(`${CONFIG.workflowOrchestratorUrl}/auth/validate`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.authenticated).toBe(true);
    expect(data.scopes).toEqual(expect.arrayContaining([
      'audio:analyze',
      'metadata:read',
      'beats:extract',
      'sections:detect',
      'psychology:analyze'
    ]));
  });

  test('Workflow Orchestrator - Template Validation', async ({ request }) => {
    expect(WORKFLOW_DEFINITION).toBeTruthy();

    const response = await request.post(`${CONFIG.workflowOrchestratorUrl}/templates/validate`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      },
      data: WORKFLOW_DEFINITION
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.valid).toBe(true);
    expect(data.warnings).toBeDefined(); // May have warnings but should be valid
  });

  test('Workflow Orchestrator - Workflow Creation', async ({ request }) => {
    const workflowConfig = {
      name: `essentia-analysis-${Date.now()}`,
      description: 'E2E test of audio analysis workflow',
      template: WORKFLOW_DEFINITION,
      parameters: {
        fileUrl: 'https://example.com/test-audio.mp3', // Will be replaced with real URL
        analysisType: 'full',
        includeMetadata: true,
        frameSampleRate: 5,
        timeout: 300000
      },
      tags: ['e2e', 'audio-analysis', 'essentia'],
      priority: 'normal'
    };

    const response = await request.post(`${CONFIG.workflowOrchestratorUrl}/workflows`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      },
      data: workflowConfig
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.workflow).toHaveProperty('id');
    expect(data.workflow).toHaveProperty('status', 'created');

    workflowId = data.workflow.id;
  });

  test('Workflow Orchestrator - Workflow Execution', async ({ request }) => {
    expect(workflowId).toBeTruthy();

    const executionConfig = {
      workflowId: workflowId,
      mode: 'async', // Asynchronous execution for E2E testing
      parameters: {
        // Override with real test file URL
        fileUrl: await uploadTestFile(),
        environment: 'test',
        monitoring: {
          enableMetrics: true,
          enableTracing: true
        }
      },
      callbacks: {
        onProgress: `${CONFIG.baseUrl}/webhooks/workflow-progress`,
        onComplete: `${CONFIG.baseUrl}/webhooks/workflow-complete`,
        onError: `${CONFIG.baseUrl}/webhooks/workflow-error`
      }
    };

    const response = await request.post(`${CONFIG.workflowOrchestratorUrl}/executions`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      },
      data: executionConfig
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.execution).toHaveProperty('id');
    expect(data.execution).toHaveProperty('status');

    executionId = data.execution.id;
  });

  test('Workflow Orchestrator - Execution Monitoring', async ({ request }) => {
    expect(executionId).toBeTruthy();

    // Monitor execution progress
    let executionComplete = false;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes with 5-second intervals

    while (!executionComplete && attempts < maxAttempts) {
      const response = await request.get(`${CONFIG.workflowOrchestratorUrl}/executions/${executionId}`, {
        headers: {
          'Authorization': `Bearer ${pow3rPassToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      const status = data.execution.status;
      expect(['created', 'queued', 'running', 'completed', 'failed', 'cancelled']).toContain(status);

      if (status === 'completed') {
        executionComplete = true;
        expect(data.execution.result).toBeTruthy();
        expect(data.execution.result.fileId).toBeTruthy();
        resultFileId = data.execution.result.fileId;

        // Verify execution metrics
        expect(data.execution.metrics).toHaveProperty('duration');
        expect(data.execution.metrics).toHaveProperty('stepsCompleted');
        expect(data.execution.metrics.stepsCompleted).toBe(WORKFLOW_DEFINITION.steps.length);

      } else if (status === 'failed') {
        console.error('Execution failed:', data.execution.error);
        throw new Error(`Workflow execution failed: ${data.execution.error?.message || 'Unknown error'}`);
      } else {
        // Log progress
        console.log(`Execution status: ${status}, progress: ${data.execution.progress || 0}%`);
      }

      if (!executionComplete) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
      }
    }

    expect(executionComplete).toBe(true);
    expect(resultFileId).toBeTruthy();
  });

  test('Workflow Orchestrator - Step-by-Step Verification', async ({ request }) => {
    expect(executionId).toBeTruthy();

    // Get detailed execution log
    const response = await request.get(`${CONFIG.workflowOrchestratorUrl}/executions/${executionId}/steps`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify all steps completed successfully
    const steps = data.steps;
    expect(steps).toHaveLength(WORKFLOW_DEFINITION.steps.length);

    // Check each step
    WORKFLOW_DEFINITION.steps.forEach((expectedStep, index) => {
      const actualStep = steps.find(s => s.id === expectedStep.id);
      expect(actualStep).toBeTruthy();
      expect(actualStep.status).toBe('completed');
      expect(actualStep.duration).toBeGreaterThan(0);
      expect(actualStep.output).toBeTruthy();
    });

    // Verify critical outputs
    const lowLevelStep = steps.find(s => s.id === 'low-level-analysis');
    expect(lowLevelStep.output).toHaveProperty('fft');
    expect(lowLevelStep.output).toHaveProperty('mfcc');
    expect(lowLevelStep.output).toHaveProperty('chords');

    const beatStep = steps.find(s => s.id === 'beat-analysis');
    expect(beatStep.output).toHaveProperty('bpm');
    expect(beatStep.output).toHaveProperty('beats');
    expect(Array.isArray(beatStep.output.beats)).toBe(true);

    const sectionStep = steps.find(s => s.id === 'section-detection');
    expect(sectionStep.output).toHaveProperty('sections');
    expect(Array.isArray(sectionStep.output.sections)).toBe(true);

    if (WORKFLOW_DEFINITION.parameters.includeMetadata) {
      const motifStep = steps.find(s => s.id === 'motif-analysis');
      expect(motifStep.output).toHaveProperty('motifs');

      const psychStep = steps.find(s => s.id === 'psychological-analysis');
      expect(psychStep.output).toHaveProperty('overallValence');
      expect(psychStep.output).toHaveProperty('overallArousal');
    }
  });

  test('Workflow Orchestrator - Result Validation', async ({ request }) => {
    expect(resultFileId).toBeTruthy();

    // Verify final results are accessible
    const resultResponse = await request.get(`${CONFIG.baseUrl}/metadata/${resultFileId}`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(resultResponse.ok()).toBeTruthy();
    const resultData = await resultResponse.json();
    expect(resultData.success).toBe(true);

    // Validate result structure matches workflow output schema
    const metadata = resultData.result;
    expect(metadata).toHaveProperty('song');
    expect(metadata).toHaveProperty('sections');
    expect(metadata).toHaveProperty('loops');
    expect(metadata).toHaveProperty('beatMarkers');

    // Validate song metadata
    expect(metadata.song).toHaveProperty('duration');
    expect(metadata.song).toHaveProperty('bpm');
    expect(metadata.song).toHaveProperty('storyArc');
    expect(metadata.song).toHaveProperty('psychological');
    expect(metadata.song).toHaveProperty('motifs');
    expect(metadata.song).toHaveProperty('quotes');

    // Validate sections
    expect(Array.isArray(metadata.sections)).toBe(true);
    metadata.sections.forEach(section => {
      expect(section).toHaveProperty('type');
      expect(section).toHaveProperty('start');
      expect(section).toHaveProperty('end');
      expect(section).toHaveProperty('confidence');
      expect(section).toHaveProperty('metadata');
    });

    // Validate loops
    expect(Array.isArray(metadata.loops)).toBe(true);
    metadata.loops.forEach(loop => {
      expect(loop).toHaveProperty('id');
      expect(loop).toHaveProperty('start');
      expect(loop).toHaveProperty('end');
      expect(loop).toHaveProperty('length');
      expect(loop).toHaveProperty('type');
      expect(loop).toHaveProperty('metadata');
    });

    // Validate beat markers
    expect(metadata.beatMarkers).toHaveProperty('bpm');
    expect(metadata.beatMarkers).toHaveProperty('beats');
    expect(metadata.beatMarkers).toHaveProperty('totalBeats');
    expect(Array.isArray(metadata.beatMarkers.beats)).toBe(true);
  });

  test('Workflow Orchestrator - Performance Metrics', async ({ request }) => {
    expect(executionId).toBeTruthy();

    const response = await request.get(`${CONFIG.workflowOrchestratorUrl}/executions/${executionId}/metrics`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify performance metrics
    expect(data.metrics).toHaveProperty('totalDuration');
    expect(data.metrics).toHaveProperty('stepDurations');
    expect(data.metrics).toHaveProperty('resourceUsage');

    // Should complete within reasonable time (allowing for 6.5min audio + processing)
    expect(data.metrics.totalDuration).toBeLessThan(600000); // 10 minutes max

    // Each step should complete within its timeout
    WORKFLOW_DEFINITION.steps.forEach(step => {
      const stepMetrics = data.metrics.stepDurations[step.id];
      expect(stepMetrics).toBeLessThan(step.timeout);
    });

    // Verify Cloudflare Edge execution
    expect(data.metrics).toHaveProperty('edgeExecution');
    expect(data.metrics.edgeExecution).toHaveProperty('datacenter');
    expect(data.metrics.edgeExecution).toHaveProperty('rayId');
  });

  test('Workflow Orchestrator - ACL and Security Validation', async ({ request }) => {
    // Test with insufficient permissions
    const limitedToken = await createLimitedToken(['metadata:read']); // Missing audio:analyze

    const response = await request.post(`${CONFIG.workflowOrchestratorUrl}/workflows`, {
      headers: {
        'Authorization': `Bearer ${limitedToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'unauthorized-test',
        template: WORKFLOW_DEFINITION,
        parameters: { fileUrl: 'https://example.com/test.mp3' }
      }
    });

    // Should fail with insufficient permissions
    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('Insufficient permissions');
  });

  test('Workflow Orchestrator - Error Handling and Recovery', async ({ request }) => {
    // Test with invalid file URL
    const invalidWorkflow = {
      name: `invalid-test-${Date.now()}`,
      description: 'Test error handling',
      template: WORKFLOW_DEFINITION,
      parameters: {
        fileUrl: 'not-a-valid-url',
        analysisType: 'full',
        includeMetadata: true
      }
    };

    const createResponse = await request.post(`${CONFIG.workflowOrchestratorUrl}/workflows`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      },
      data: invalidWorkflow
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const errorWorkflowId = createData.workflow.id;

    // Execute and expect graceful failure
    const execResponse = await request.post(`${CONFIG.workflowOrchestratorUrl}/executions`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        workflowId: errorWorkflowId,
        mode: 'async'
      }
    });

    expect(execResponse.ok()).toBeTruthy();

    // Wait for failure and verify error handling
    let errorHandled = false;
    let attempts = 0;
    const maxErrorAttempts = 30; // 2.5 minutes

    while (!errorHandled && attempts < maxErrorAttempts) {
      const statusResponse = await request.get(`${CONFIG.workflowOrchestratorUrl}/executions/${execResponse.execution?.id || 'unknown'}`, {
        headers: {
          'Authorization': `Bearer ${pow3rPassToken}`
        }
      });

      if (statusResponse.ok()) {
        const statusData = await statusResponse.json();
        if (statusData.execution.status === 'failed') {
          errorHandled = true;
          expect(statusData.execution.error).toBeTruthy();
          expect(statusData.execution.error.category).toBe('input_validation');
        }
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    expect(errorHandled).toBe(true);
  });

  test('Workflow Orchestrator - Resource Cleanup', async ({ request }) => {
    // Cleanup test workflows and executions
    const cleanupIds = [workflowId, executionId].filter(id => id);

    for (const id of cleanupIds) {
      try {
        // Cancel workflow if still running
        await request.post(`${CONFIG.workflowOrchestratorUrl}/workflows/${id}/cancel`, {
          headers: {
            'Authorization': `Bearer ${pow3rPassToken}`
          }
        });

        // Delete workflow
        await request.delete(`${CONFIG.workflowOrchestratorUrl}/workflows/${id}`, {
          headers: {
            'Authorization': `Bearer ${pow3rPassToken}`
          }
        });
      } catch (error) {
        console.warn(`Cleanup failed for ${id}:`, error);
      }
    }

    // Cleanup test file if created
    if (resultFileId) {
      try {
        await request.delete(`${CONFIG.baseUrl}/files/${resultFileId}`, {
          headers: {
            'Authorization': `Bearer ${pow3rPassToken}`
          }
        });
      } catch (error) {
        console.warn(`File cleanup failed for ${resultFileId}:`, error);
      }
    }
  });
});

/**
 * Setup Pow3r Pass authentication
 */
async function setupPow3rPassAuthentication() {
  if (process.env.CI) {
    // Use real Pow3r Pass API in CI
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
    // Return test token for local development
    return process.env.POW3R_PASS_TOKEN || 'test-pow3r-pass-token';
  }
}

/**
 * Create a token with limited permissions for ACL testing
 */
async function createLimitedToken(scopes) {
  // In production, this would create a real limited token
  return `limited-token-${scopes.join('-')}-${Date.now()}`;
}

/**
 * Upload test audio file and return URL
 */
async function uploadTestFile() {
  try {
    // In a real test, upload the test file to a temporary location
    // For now, return a placeholder URL
    return 'https://example.com/test-audio.mp3';
  } catch (error) {
    console.warn('Test file upload failed:', error);
    return 'https://example.com/test-audio.mp3';
  }
}
