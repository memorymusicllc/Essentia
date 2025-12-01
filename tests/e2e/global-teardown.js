/**
 * Global teardown for Essentia E2E tests
 *
 * Cleans up test resources, generates test reports, and validates
 * test execution results after running E2E test suite.
 */

const fs = require('fs');
const path = require('path');

async function globalTeardown(config) {
  console.log('\n🧹 Starting Essentia E2E test suite teardown...');

  const testRunId = process.env.TEST_RUN_ID;
  const startTime = process.env.TEST_START_TIME;
  const endTime = new Date().toISOString();

  // Calculate test duration
  if (startTime) {
    const duration = new Date(endTime) - new Date(startTime);
    console.log(`⏱️  Test suite duration: ${Math.round(duration / 1000)}s`);
  }

  // Clean up test artifacts
  try {
    console.log('🧽 Cleaning up test artifacts...');

    // Clean up any temporary files created during tests
    const tempDir = path.join(process.cwd(), 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('🗑️  Cleaned up temporary files');
    }

    // Log cleanup completion
    console.log('✅ Test artifact cleanup complete');
  } catch (error) {
    console.warn('⚠️  Error during cleanup:', error.message);
  }

  // Generate test summary report
  try {
    const testResultsDir = path.join(process.cwd(), 'test-results');
    const summaryFile = path.join(testResultsDir, `test-summary-${testRunId}.json`);

    const summary = {
      testRunId,
      environment: process.env.TEST_ENVIRONMENT,
      startTime,
      endTime,
      duration: startTime ? new Date(endTime) - new Date(startTime) : null,
      pow3rWorkflow: true,
      cloudflareEdge: true,
      services: {
        essentia: process.env.ESSENTIA_URL,
        workflow: process.env.WORKFLOW_URL,
        pow3rPass: process.env.POW3R_PASS_URL
      },
      configuration: {
        frameSampleRate: process.env.FRAME_SAMPLE_RATE || '5',
        timeout: process.env.TEST_TIMEOUT || '600000',
        retries: process.env.RETRIES || '2'
      }
    };

    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`📊 Test summary saved: ${summaryFile}`);
  } catch (error) {
    console.warn('⚠️  Error generating test summary:', error.message);
  }

  // Validate Pow3r Workflow Orchestrator state
  try {
    console.log('🔍 Validating workflow orchestrator state...');

    const workflowUrl = process.env.WORKFLOW_URL || 'https://config.superbots.link/mcp/workflow';
    const response = await fetch(`${workflowUrl}/health`, {
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${process.env.POW3R_PASS_TOKEN || 'test-token'}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Workflow orchestrator status: ${data.status}`);

      // Log any active workflows (for debugging)
      if (data.activeWorkflows > 0) {
        console.warn(`⚠️  ${data.activeWorkflows} workflows still active after test completion`);
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not validate workflow orchestrator state:', error.message);
  }

  // Archive test results for CI/CD
  if (process.env.CI) {
    try {
      console.log('📦 Archiving test results for CI/CD...');

      const archiveDir = path.join(process.cwd(), 'test-results', 'archive');
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      // Copy key files to archive
      const filesToArchive = [
        'test-results/e2e-results.json',
        'test-results/e2e-junit.xml',
        `test-results/test-summary-${testRunId}.json`
      ];

      for (const file of filesToArchive) {
        if (fs.existsSync(file)) {
          const destFile = path.join(archiveDir, path.basename(file));
          fs.copyFileSync(file, destFile);
        }
      }

      console.log('✅ Test results archived');
    } catch (error) {
      console.warn('⚠️  Error archiving test results:', error.message);
    }
  }

  // Final status report
  console.log('\n📋 Essentia E2E Test Suite Summary:');
  console.log(`🏷️  Test Run ID: ${testRunId}`);
  console.log(`🌍 Environment: ${process.env.TEST_ENVIRONMENT}`);
  console.log(`⏰ Completed: ${endTime}`);
  console.log(`🔧 Pow3r Workflow: Enabled`);
  console.log(`☁️  Cloudflare Edge: Enabled`);
  console.log(`🔐 Pow3r Pass ACL: Enabled`);
  console.log('\n🎉 Essentia E2E test suite teardown complete!');
}

// Export for Playwright
module.exports = globalTeardown;
