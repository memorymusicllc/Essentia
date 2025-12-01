/**
 * Essentia Audio Analysis Service - Cloudflare Worker
 *
 * Cloud-based audio analysis service using Essentia.js WASM backend.
 * Provides comprehensive audio feature extraction with beat markers,
 * section detection, and songwriting metadata at song/section/loop levels.
 *
 * Supports both REST API and MCP server interfaces.
 *
 * @module worker
 */

import { MCPServer } from './mcp-server.js';
import { handleAudioAnalysis } from './audio-handler.js';
import { R2_BUCKET } from './config/r2Config.js';
import { requireAuth, authenticateMCPRequest, SCOPES } from './middleware/auth.js';
import { getGlobalRegistry, initializeRegistry } from './utils/service-registry.js';

/**
 * Main Cloudflare Worker fetch handler
 * Routes requests to appropriate handlers based on path and headers
 *
 * @param {Request} request - Cloudflare Worker request object
 * @param {Object} env - Environment variables and bindings
 * @param {Object} ctx - Execution context
 * @returns {Response} Worker response
 */
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // Set up environment variables
      globalThis.env = env;
      globalThis.ctx = ctx;

      // Initialize service registry (idempotent)
      await initializeRegistry(env);

      // Handle CORS preflight requests
      if (method === 'OPTIONS') {
        return handleCors();
      }

      // Route to MCP server if MCP headers are present
      if (isMCPRequest(request)) {
        const authResult = await authenticateMCPRequest(request, env);
        if (authResult instanceof Response) {
          return authResult; // Authentication failed
        }
        return await handleMCPRequest(request, env, authResult);
      }

      // Route to REST API
      if (path === '/' && method === 'POST') {
        // Require authentication for audio analysis
        const authResult = await requireAuth(request, env, [SCOPES.ANALYZE_AUDIO]);
        if (authResult instanceof Response) {
          return authResult; // Authentication failed
        }
        return await handleAudioAnalysis(request, env, authResult);
      }

      // Health check endpoint (public)
      if (path === '/health' && method === 'GET') {
        return handleHealthCheck(env);
      }

      // Service registry status endpoint
      if (path === '/registry/status' && method === 'GET') {
        const authResult = await requireAuth(request, env, [SCOPES.ADMIN]);
        if (authResult instanceof Response) {
          return authResult;
        }
        return handleRegistryStatus(env);
      }

      // Default response for unsupported routes
      return new Response(
        JSON.stringify({
          error: 'Not Found',
          message: 'Endpoint not supported. Use POST / for audio analysis or MCP protocol.'
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version'
          }
        }
      );

    } catch (error) {
      console.error('Worker error:', error);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Internal Server Error',
          message: error.message || 'An unexpected error occurred'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  }
};

/**
 * Check if request is an MCP protocol request
 *
 * @param {Request} request - Cloudflare Worker request object
 * @returns {boolean} True if MCP request
 */
function isMCPRequest(request) {
  const mcpVersion = request.headers.get('MCP-Protocol-Version');
  const contentType = request.headers.get('Content-Type');

  return mcpVersion !== null ||
         (contentType && contentType.includes('application/json') &&
          request.url.includes('mcp'));
}

/**
 * Handle MCP protocol requests
 *
 * @param {Request} request - MCP request
 * @param {Object} env - Environment variables
 * @param {Object} authResult - Authentication result
 * @returns {Response} MCP response
 */
async function handleMCPRequest(request, env, authResult) {
  try {
    const mcpServer = new MCPServer(env, authResult);
    return await mcpServer.handleRequest(request);
  } catch (error) {
    console.error('MCP server error:', error);

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message
        },
        id: null
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

/**
 * Handle CORS preflight requests
 *
 * @returns {Response} CORS response
 */
function handleCors() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Handle health check requests
 *
 * @param {Object} env - Environment variables
 * @returns {Response} Health check response
 */
function handleHealthCheck(env) {
  const registry = getGlobalRegistry(env);

  return new Response(
    JSON.stringify({
      status: 'healthy',
      service: 'Essentia Audio Analysis',
      version: '1.0.0',
      environment: env?.WORKER_ENV || 'production',
      timestamp: new Date().toISOString(),
      registry: {
        registered: registry.registered,
        serviceId: registry.serviceId
      },
      frameSampleRate: env?.FRAME_SAMPLE_RATE || '5'
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
}

/**
 * Handle registry status requests
 *
 * @param {Object} env - Environment variables
 * @returns {Response} Registry status response
 */
function handleRegistryStatus(env) {
  const { getRegistryHealth } = require('./utils/service-registry.js');
  const registryHealth = getRegistryHealth(env);

  return new Response(
    JSON.stringify(registryHealth),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
}

/**
 * Handle scheduled tasks (if configured)
 *
 * @param {Object} event - Scheduled event
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Execution context
 */
export async function scheduled(event, env, ctx) {
  // Handle scheduled tasks (cleanup, maintenance, etc.)
  console.log('Scheduled task executed at:', event.cron);

  // Example: Clean up old analysis results
  try {
    // Implement cleanup logic here if needed
    console.log('Scheduled cleanup completed');
  } catch (error) {
    console.error('Scheduled task error:', error);
  }
}

/**
 * Handle Durable Object requests (if configured)
 *
 * @param {Object} state - Durable Object state
 * @returns {Object} Durable Object handlers
 */
export class AudioProcessor {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    // Handle Durable Object requests for long-running audio processing
    // This can be used for processing very large files or complex analyses

    const url = new URL(request.url);

    if (url.pathname === '/process') {
      // Implement chunked processing logic here
      return new Response('Processing started', { status: 202 });
    }

    return new Response('Durable Object endpoint', { status: 200 });
  }
}
