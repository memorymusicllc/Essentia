/**
 * Playwright configuration for Essentia E2E tests
 *
 * Configures Playwright for testing the Essentia audio analysis service
 * with Pow3r Workflow Orchestrator on Cloudflare Edge.
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in files in parallel */
  fullyParallel: false, // Sequential for workflow testing

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testconfig. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'https://essentia.yourdomain.workers.dev',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot only when test fails */
    screenshot: 'only-on-failure',

    /* Record video only when test fails */
    video: 'retain-on-failure',

    /* Timeout for individual actions */
    actionTimeout: 30000,

    /* Timeout for individual tests */
    timeout: 600000, // 10 minutes for workflow tests

    /* Global test timeout */
    globalTimeout: 1800000, // 30 minutes for full E2E suite

    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'X-Test-Runner': 'playwright-e2e',
      'X-Pow3r-Workflow': 'true'
    },

    /* Ignore HTTPS errors in test environment */
    ignoreHTTPSErrors: true
  },

  /* Configure projects for major browsers and API testing */
  projects: [
    {
      name: 'essentia-e2e',
      testMatch: 'essentia-audio-analysis.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.ESSENTIA_URL || 'https://essentia.yourdomain.workers.dev',
        extraHTTPHeaders: {
          'X-Test-Suite': 'essentia-audio-analysis',
          'Authorization': `Bearer ${process.env.POW3R_PASS_TOKEN || 'test-token'}`
        }
      }
    },
    {
      name: 'workflow-orchestrator-e2e',
      testMatch: 'workflow-orchestrator.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.WORKFLOW_URL || 'https://config.superbots.link/mcp/workflow',
        extraHTTPHeaders: {
          'X-Test-Suite': 'workflow-orchestrator',
          'Authorization': `Bearer ${process.env.POW3R_PASS_TOKEN || 'test-token'}`,
          'MCP-Protocol-Version': '2024-11-05'
        }
      }
    }
  ],

  /* Run your local dev server before starting the tests */
  webServer: undefined, // Tests run against deployed services

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.js'),

  /* Test metadata */
  metadata: {
    project: 'Essentia Audio Analysis',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'test',
    pow3rWorkflow: true,
    cloudflareEdge: true
  }
});
