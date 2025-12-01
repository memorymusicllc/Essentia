/** @type {import('jest').Config} */
module.exports = {
  // Use miniflare environment for Cloudflare Workers compatibility
  testEnvironment: 'jest-environment-miniflare',

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
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

  // Transform ES modules
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },

  // Test timeout for audio processing
  testTimeout: 30000,

  // Verbose output
  verbose: true
};
