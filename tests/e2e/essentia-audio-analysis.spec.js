/**
 * Essentia Audio Analysis E2E Tests
 *
 * End-to-end tests for the Essentia audio analysis service running on
 * Pow3r Workflow Orchestrator with Pow3r Pass authentication.
 *
 * Tests cover:
 * - Pow3r Pass authentication
 * - Workflow orchestration
 * - Audio analysis pipeline
 * - ACL and permission handling
 * - Cloudflare Edge execution
 *
 * @module essentia-e2e
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test configuration
const CONFIG = {
  baseUrl: 'https://essentia.yourdomain.workers.dev', // Update with actual deployed URL
  pow3rPassUrl: 'https://config.superbots.link/pass',
  workflowOrchestratorUrl: 'https://config.superbots.link/mcp/workflow',
  testAudioFile: join(__dirname, '../../docs/No Its Not.mp3'),
  timeout: 300000, // 5 minutes for audio processing
};

// Test credentials (should be set via environment variables in CI)
const TEST_CREDENTIALS = {
  pow3rPass: process.env.POW3R_PASS_TOKEN || 'test-token',
  userId: process.env.TEST_USER_ID || 'test-user',
  scopes: ['audio:analyze', 'metadata:read', 'beats:extract']
};

// ACL Test Matrix
const ACL_TESTS = [
  {
    name: 'Audio Analysis ACL',
    requiredScopes: ['audio:analyze'],
    endpoint: '/analyze',
    method: 'POST',
    payload: { fileUrl: 'https://example.com/test.mp3' }
  },
  {
    name: 'Metadata Read ACL',
    requiredScopes: ['metadata:read'],
    endpoint: '/metadata/{fileId}',
    method: 'GET',
    payload: {}
  },
  {
    name: 'Beat Extraction ACL',
    requiredScopes: ['beats:extract'],
    endpoint: '/beats',
    method: 'POST',
    payload: { fileUrl: 'https://example.com/test.mp3' }
  },
  {
    name: 'Section Detection ACL',
    requiredScopes: ['sections:detect'],
    endpoint: '/sections',
    method: 'POST',
    payload: { fileUrl: 'https://example.com/test.mp3' }
  },
  {
    name: 'Psychology Analysis ACL',
    requiredScopes: ['psychology:analyze'],
    endpoint: '/psychology',
    method: 'POST',
    payload: { fileUrl: 'https://example.com/test.mp3' }
  }
];

test.describe('Essentia Audio Analysis - Pow3r Workflow Orchestrator E2E', () => {
  let workflowExecutionId = null;
  let testFileId = null;
  let pow3rPassToken = null;

  test.beforeAll(async () => {
    // Setup Pow3r Pass authentication
    pow3rPassToken = await setupPow3rPassAuthentication();
    expect(pow3rPassToken).toBeTruthy();
  });

  test('Pow3r Pass Authentication - Token Validation', async ({ request }) => {
    const response = await request.post(`${CONFIG.pow3rPassUrl}/validate`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        provider: 'essentia',
        scopes: TEST_CREDENTIALS.scopes
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.valid).toBe(true);
    expect(data.data.scopes).toEqual(expect.arrayContaining(TEST_CREDENTIALS.scopes));
  });

  test('ACL Matrix - All Required Permissions', async ({ request }) => {
    for (const aclTest of ACL_TESTS) {
      await test.step(`ACL Test: ${aclTest.name}`, async () => {
        const response = await request.post(CONFIG.baseUrl + aclTest.endpoint, {
          headers: {
            'Authorization': `Bearer ${pow3rPassToken}`,
            'Content-Type': 'application/json'
          },
          data: aclTest.payload
        });

        // Should succeed with proper authentication
        if (aclTest.endpoint.includes('{fileId}')) {
          // Skip file-specific tests without a file ID
          expect([401, 404]).toContain(response.status());
        } else {
          expect(response.ok()).toBeTruthy();
        }
      });
    }
  });

  test('Workflow Orchestrator - Audio Analysis Workflow Creation', async ({ request }) => {
    // Create workflow for audio analysis
    const workflowDefinition = {
      name: 'essentia-audio-analysis-workflow',
      description: 'Complete audio analysis pipeline with metadata extraction',
      template: 'audio-analysis-pipeline',
      parameters: {
        fileUrl: 'https://example.com/test.mp3',
        analysisType: 'full',
        includeMetadata: true
      },
      authentication: {
        pow3rPass: pow3rPassToken,
        requiredScopes: ['audio:analyze', 'metadata:read']
      }
    };

    const response = await request.post(`${CONFIG.workflowOrchestratorUrl}/workflows/create`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      },
      data: workflowDefinition
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.workflowId).toBeTruthy();

    workflowExecutionId = data.data.workflowId;
  });

  test('Workflow Orchestrator - Execute Audio Analysis', async ({ request }) => {
    expect(workflowExecutionId).toBeTruthy();

    // Execute the workflow
    const response = await request.post(`${CONFIG.workflowOrchestratorUrl}/workflows/${workflowExecutionId}/execute`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        parameters: {
          frameSampleRate: 5,
          timeout: 300000
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.executionId).toBeTruthy();
  });

  test('Workflow Orchestrator - Monitor Execution Progress', async ({ request }) => {
    expect(workflowExecutionId).toBeTruthy();

    // Poll for execution status
    let executionComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals

    while (!executionComplete && attempts < maxAttempts) {
      const response = await request.get(`${CONFIG.workflowOrchestratorUrl}/workflows/${workflowExecutionId}/status`, {
        headers: {
          'Authorization': `Bearer ${pow3rPassToken}`
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      const status = data.data.status;
      expect(['pending', 'running', 'completed', 'failed']).toContain(status);

      if (status === 'completed') {
        executionComplete = true;
        expect(data.data.result).toBeTruthy();
        expect(data.data.result.fileId).toBeTruthy();
        testFileId = data.data.result.fileId;
      } else if (status === 'failed') {
        throw new Error(`Workflow execution failed: ${data.data.error}`);
      }

      if (!executionComplete) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
      }
    }

    expect(executionComplete).toBe(true);
    expect(testFileId).toBeTruthy();
  });

  test('Audio Analysis Results - Low-Level Features', async ({ request }) => {
    expect(testFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${testFileId}?type=all`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify low-level features
    const metadata = data.result;
    expect(metadata).toHaveProperty('fft');
    expect(metadata).toHaveProperty('dct');
    expect(metadata).toHaveProperty('mfcc');
    expect(metadata).toHaveProperty('chords');
    expect(metadata).toHaveProperty('beatsDetection');
  });

  test('Audio Analysis Results - Beat Markers & Loop Slicing', async ({ request }) => {
    expect(testFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${testFileId}?type=beatMarkers`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const beatMarkers = data.result;
    expect(beatMarkers).toHaveProperty('bpm');
    expect(beatMarkers).toHaveProperty('beats');
    expect(beatMarkers).toHaveProperty('totalBeats');
    expect(Array.isArray(beatMarkers.beats)).toBe(true);
    expect(beatMarkers.beats.length).toBeGreaterThan(0);
  });

  test('Audio Analysis Results - Song Section Detection', async ({ request }) => {
    expect(testFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${testFileId}?type=sections`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const sections = data.result;
    expect(Array.isArray(sections)).toBe(true);

    sections.forEach(section => {
      expect(section).toHaveProperty('type');
      expect(section).toHaveProperty('start');
      expect(section).toHaveProperty('end');
      expect(section).toHaveProperty('confidence');
      expect(['verse', 'chorus', 'bridge', 'intro', 'outro']).toContain(section.type);
    });
  });

  test('Audio Analysis Results - Songwriting Metadata', async ({ request }) => {
    expect(testFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${testFileId}?type=song`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const songMetadata = data.result;
    expect(songMetadata).toHaveProperty('duration');
    expect(songMetadata).toHaveProperty('bpm');
    expect(songMetadata).toHaveProperty('storyArc');
    expect(songMetadata).toHaveProperty('psychological');
    expect(songMetadata).toHaveProperty('motifs');
    expect(songMetadata).toHaveProperty('quotes');
  });

  test('Audio Analysis Results - Psychological Analysis', async ({ request }) => {
    expect(testFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${testFileId}?type=song`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    const psychological = data.result.psychological;
    expect(psychological).toHaveProperty('overallValence');
    expect(psychological).toHaveProperty('overallArousal');
    expect(psychological).toHaveProperty('emotionalTrajectory');
    expect(psychological).toHaveProperty('paradigmShifts');

    expect(psychological.overallValence).toBeGreaterThanOrEqual(0);
    expect(psychological.overallValence).toBeLessThanOrEqual(1);
    expect(psychological.overallArousal).toBeGreaterThanOrEqual(0);

    expect(Array.isArray(psychological.emotionalTrajectory)).toBe(true);
    expect(Array.isArray(psychological.paradigmShifts)).toBe(true);
  });

  test('Audio Analysis Results - Loop Points Generation', async ({ request }) => {
    expect(testFileId).toBeTruthy();

    const response = await request.get(`${CONFIG.baseUrl}/metadata/${testFileId}?type=loops`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);

    const loops = data.result;
    expect(Array.isArray(loops)).toBe(true);

    loops.forEach(loop => {
      expect(loop).toHaveProperty('id');
      expect(loop).toHaveProperty('start');
      expect(loop).toHaveProperty('end');
      expect(loop).toHaveProperty('length');
      expect(loop).toHaveProperty('type');
      expect(loop).toHaveProperty('metadata');
      expect(['4-beat', '8-beat', '16-beat']).toContain(loop.type);
    });
  });

  test('MCP Server Integration - Tool Execution', async ({ request }) => {
    // Test MCP server tools directly
    const tools = [
      {
        name: 'analyze_audio',
        parameters: { fileUrl: 'https://example.com/test.mp3', includeMetadata: true }
      },
      {
        name: 'extract_beats',
        parameters: { fileUrl: 'https://example.com/test.mp3' }
      },
      {
        name: 'detect_sections',
        parameters: { fileUrl: 'https://example.com/test.mp3' }
      }
    ];

    for (const tool of tools) {
      await test.step(`MCP Tool: ${tool.name}`, async () => {
        const response = await request.post(`${CONFIG.baseUrl}/mcp/tools/call`, {
          headers: {
            'Authorization': `Bearer ${pow3rPassToken}`,
            'Content-Type': 'application/json',
            'MCP-Protocol-Version': '2024-11-05'
          },
          data: {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
              name: tool.name,
              arguments: tool.parameters
            }
          }
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.result).toHaveProperty('content');
      });
    }
  });

  test('ACL Failure - Insufficient Permissions', async ({ request }) => {
    // Create a token with limited permissions
    const limitedToken = await createLimitedPow3rPassToken(['metadata:read']);

    const response = await request.post(CONFIG.baseUrl + '/analyze', {
      headers: {
        'Authorization': `Bearer ${limitedToken}`,
        'Content-Type': 'application/json'
      },
      data: { fileUrl: 'https://example.com/test.mp3' }
    });

    // Should fail due to insufficient permissions
    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('Insufficient permissions');
  });

  test('Workflow Orchestrator - Error Handling', async ({ request }) => {
    // Test with invalid file URL
    const invalidWorkflow = {
      name: 'invalid-audio-test',
      template: 'audio-analysis-pipeline',
      parameters: {
        fileUrl: 'invalid-url',
        analysisType: 'full'
      }
    };

    const response = await request.post(`${CONFIG.workflowOrchestratorUrl}/workflows/create`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      },
      data: invalidWorkflow
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Should create workflow but execution should fail gracefully
    expect(data.success).toBe(true);
    expect(data.data.workflowId).toBeTruthy();

    // Execute and expect graceful failure
    const executeResponse = await request.post(`${CONFIG.workflowOrchestratorUrl}/workflows/${data.data.workflowId}/execute`, {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(executeResponse.ok()).toBeTruthy();
  });

  test('Performance - Cloudflare Edge Execution Time', async ({ request }) => {
    const startTime = Date.now();

    const response = await request.post(CONFIG.baseUrl + '/analyze', {
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`,
        'Content-Type': 'application/json'
      },
      data: { fileUrl: 'https://example.com/test.mp3' }
    });

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    expect(response.ok()).toBeTruthy();

    // Should complete within reasonable time (allowing for network latency)
    expect(executionTime).toBeLessThan(10000); // 10 seconds max for API call

    // Check Cloudflare headers indicate edge execution
    const cfRay = response.headers()['cf-ray'];
    expect(cfRay).toBeTruthy(); // Cloudflare Ray ID indicates edge execution
  });

  test.afterAll(async () => {
    // Cleanup: Delete test file if it exists
    if (testFileId) {
      try {
        await fetch(`${CONFIG.baseUrl}/files/${testFileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${pow3rPassToken}`
          }
        });
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    }

    // Cleanup: Cancel workflow if still running
    if (workflowExecutionId) {
      try {
        await fetch(`${CONFIG.workflowOrchestratorUrl}/workflows/${workflowExecutionId}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${pow3rPassToken}`
          }
        });
      } catch (error) {
        console.warn('Workflow cleanup failed:', error);
      }
    }
  });
});

/**
 * Setup Pow3r Pass authentication for testing
 */
async function setupPow3rPassAuthentication() {
  // In CI/production, this would use real Pow3r Pass API
  // For testing, we'll mock or use a test token

  if (process.env.CI) {
    // Use real Pow3r Pass API in CI
    const response = await fetch(`${CONFIG.pow3rPassUrl}/credentials/essentia`, {
      headers: {
        'Authorization': `Bearer ${process.env.POW3R_PASS_MASTER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get Pow3r Pass token');
    }

    const data = await response.json();
    return data.data.value;
  } else {
    // Use test token for local development
    return TEST_CREDENTIALS.pow3rPass;
  }
}

/**
 * Create a limited permission Pow3r Pass token for ACL testing
 */
async function createLimitedPow3rPassToken(scopes) {
  // In production, this would create a token with limited scopes
  // For testing, return a mock token
  return `limited-token-${scopes.join('-')}`;
}

/**
 * Upload test audio file to temporary storage
 */
async function uploadTestAudioFile() {
  try {
    const audioData = readFileSync(CONFIG.testAudioFile);

    // Upload to temporary storage (e.g., Cloudflare R2 or similar)
    const formData = new FormData();
    formData.append('file', new Blob([audioData]), 'test-audio.mp3');

    const response = await fetch(`${CONFIG.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${pow3rPassToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to upload test file');
    }

    const data = await response.json();
    return data.fileUrl;
  } catch (error) {
    console.warn('Test file upload failed, using placeholder URL:', error);
    return 'https://example.com/test-audio.mp3';
  }
}




