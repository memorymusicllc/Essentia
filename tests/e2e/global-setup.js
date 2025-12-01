/**
 * Global setup for Essentia E2E tests
 *
 * Sets up test environment, validates Pow3r Pass authentication,
 * and prepares test data before running E2E test suite.
 */

const fs = require('fs');
const path = require('path');

async function globalSetup(config) {
  console.log('🚀 Starting Essentia E2E test suite setup...');

  // Validate environment variables
  const requiredEnvVars = [
    'POW3R_PASS_TOKEN',
    'ESSENTIA_URL',
    'WORKFLOW_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
    console.warn('Using test defaults for missing variables');
  }

  // Validate Pow3r Pass authentication
  try {
    console.log('🔐 Validating Pow3r Pass authentication...');

    const pow3rPassUrl = process.env.POW3R_PASS_URL || 'https://config.superbots.link/pass';
    const response = await fetch(`${pow3rPassUrl}/health`, {
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Pow3r Pass health check failed: ${response.status}`);
    }

    console.log('✅ Pow3r Pass authentication available');
  } catch (error) {
    console.warn('⚠️  Pow3r Pass authentication not available:', error.message);
    console.warn('Tests will use mock authentication');
  }

  // Validate service endpoints
  const endpoints = [
    {
      name: 'Essentia Service',
      url: process.env.ESSENTIA_URL || 'https://essentia.yourdomain.workers.dev',
      endpoint: '/health'
    },
    {
      name: 'Workflow Orchestrator',
      url: process.env.WORKFLOW_URL || 'https://config.superbots.link/mcp/workflow',
      endpoint: '/health'
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Checking ${endpoint.name} health...`);

      const response = await fetch(`${endpoint.url}${endpoint.endpoint}`, {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${process.env.POW3R_PASS_TOKEN || 'test-token'}`
        }
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.status !== 'healthy') {
        throw new Error(`Service not healthy: ${data.status}`);
      }

      console.log(`✅ ${endpoint.name} is healthy`);
    } catch (error) {
      console.warn(`⚠️  ${endpoint.name} health check failed:`, error.message);
      console.warn('Tests may fail if service is not available');
    }
  }

  // Create test results directory
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
    console.log('📁 Created test results directory');
  }

  // Validate test audio file
  const testAudioFile = path.join(process.cwd(), 'docs', 'No Its Not.mp3');
  if (!fs.existsSync(testAudioFile)) {
    console.warn('⚠️  Test audio file not found:', testAudioFile);
    console.warn('Some tests may be skipped');
  } else {
    const stats = fs.statSync(testAudioFile);
    console.log(`🎵 Test audio file ready: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  }

  // Validate workflow definition
  const workflowFile = path.join(process.cwd(), 'tests', 'e2e', 'audio-analysis-workflow.yml');
  if (!fs.existsSync(workflowFile)) {
    console.warn('⚠️  Workflow definition file not found:', workflowFile);
    console.warn('Workflow tests will be skipped');
  } else {
    console.log('📋 Workflow definition loaded');
  }

  // Set up test metadata
  process.env.TEST_START_TIME = new Date().toISOString();
  process.env.TEST_ENVIRONMENT = process.env.NODE_ENV || 'test';
  process.env.TEST_RUN_ID = `e2e-${Date.now()}`;

  console.log(`🏷️  Test run ID: ${process.env.TEST_RUN_ID}`);
  console.log('🎯 Essentia E2E test suite setup complete!\n');
}

module.exports = globalSetup;




