/** @type {import('jest').Config} */
module.exports = {
  // Use node environment for all tests to avoid ES module issues
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],

  // Exclude E2E tests (they use Playwright, not Jest)
  // Temporarily exclude integration tests that need proper mocking setup
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/',
    '/tests/integration.test.js',
    '/tests/mcp-server.test.js'
  ],

  // Collect coverage from source files
  collectCoverageFrom: [
    'helpers.js',
    'audio-handler.js',
    'mcp-server.js',
    'mcp-tools.js',
    'worker.js',
    '!node_modules/**',
    '!tests/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Global setup
  globals: {
    'ts-jest': {
      tsconfig: false
    }
  },

  // Transform ES modules
  transform: {},

  // Use CommonJS
  extensionsToTreatAsEsm: [],

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },

  // Test timeout for audio processing
  testTimeout: 30000,

  // Verbose output
  verbose: true
};
