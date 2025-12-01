/**
 * Authentication Middleware for Cloudflare Workers
 *
 * Handles power pass authentication and authorization for the Essentia service.
 *
 * @module middleware/auth
 */

import { validatePowerPass, checkPermissions } from '../config/superbots.js';

/**
 * Authentication middleware for Cloudflare Workers
 *
 * @param {Request} request - Cloudflare Worker request
 * @param {Object} env - Environment variables
 * @param {Object} requiredScopes - Array of required permission scopes
 * @returns {Object} Authentication result
 */
export async function authenticateRequest(request, env, requiredScopes = []) {
  try {
    // Extract authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return {
        authenticated: false,
        error: 'Missing Authorization header',
        status: 401
      };
    }

    // Check for Bearer token
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!bearerMatch) {
      return {
        authenticated: false,
        error: 'Invalid Authorization header format. Expected: Bearer <token>',
        status: 401
      };
    }

    const token = bearerMatch[1];

    // Validate power pass token
    const tokenPayload = await validatePowerPass(token);

    // Check required scopes
    if (requiredScopes.length > 0) {
      const hasPermission = requiredScopes.every(scope =>
        checkPermissions(tokenPayload, scope)
      );

      if (!hasPermission) {
        return {
          authenticated: false,
          error: `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`,
          status: 403
        };
      }
    }

    return {
      authenticated: true,
      user: tokenPayload.sub,
      scopes: tokenPayload.scopes || [],
      tokenPayload: tokenPayload
    };

  } catch (error) {
    console.error('Authentication error:', error);

    return {
      authenticated: false,
      error: `Authentication failed: ${error.message}`,
      status: 401
    };
  }
}

/**
 * Require authentication for a request
 *
 * @param {Request} request - Cloudflare Worker request
 * @param {Object} env - Environment variables
 * @param {Array} requiredScopes - Required permission scopes
 * @returns {Response|Object} Error response or authentication result
 */
export async function requireAuth(request, env, requiredScopes = []) {
  const authResult = await authenticateRequest(request, env, requiredScopes);

  if (!authResult.authenticated) {
    return new Response(
      JSON.stringify({
        success: false,
        error: authResult.error
      }),
      {
        status: authResult.status,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer'
        }
      }
    );
  }

  return authResult;
}

/**
 * Create authenticated response with user context
 *
 * @param {Object} authResult - Authentication result from requireAuth
 * @param {Object} data - Response data
 * @param {Object} options - Response options
 * @returns {Response} Authenticated response
 */
export function createAuthenticatedResponse(authResult, data, options = {}) {
  const responseData = {
    ...data,
    _auth: {
      user: authResult.user,
      scopes: authResult.scopes,
      authenticatedAt: new Date().toISOString()
    }
  };

  return new Response(
    JSON.stringify(responseData),
    {
      status: options.status || 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User': authResult.user,
        ...options.headers
      }
    }
  );
}

/**
 * Scope definitions for different operations
 */
export const SCOPES = {
  ANALYZE_AUDIO: 'audio:analyze',
  READ_METADATA: 'metadata:read',
  EXTRACT_BEATS: 'beats:extract',
  DETECT_SECTIONS: 'sections:detect',
  ANALYZE_PSYCHOLOGY: 'psychology:analyze',
  ADMIN: 'admin'
};

/**
 * Get required scopes for different operations
 *
 * @param {string} operation - Operation name
 * @returns {Array} Required scopes
 */
export function getRequiredScopes(operation) {
  const scopeMap = {
    'analyze_audio': [SCOPES.ANALYZE_AUDIO],
    'get_metadata': [SCOPES.READ_METADATA],
    'extract_beats': [SCOPES.EXTRACT_BEATS],
    'detect_sections': [SCOPES.DETECT_SECTIONS],
    'analyze_psychology': [SCOPES.ANALYZE_PSYCHOLOGY],
    'admin': [SCOPES.ADMIN]
  };

  return scopeMap[operation] || [];
}

/**
 * Middleware for MCP requests
 *
 * @param {Request} request - MCP request
 * @param {Object} env - Environment variables
 * @returns {Response|Object} Authentication result or error response
 */
export async function authenticateMCPRequest(request, env) {
  // MCP requests may have authentication in different headers
  const authHeader = request.headers.get('Authorization') ||
                    request.headers.get('X-Power-Pass-Token');

  if (!authHeader) {
    // For MCP requests, we might allow anonymous access for listing tools/resources
    const url = new URL(request.url);
    const isPublicEndpoint = url.pathname.includes('/list') ||
                           url.pathname.includes('/describe');

    if (isPublicEndpoint) {
      return {
        authenticated: true,
        user: 'anonymous',
        scopes: [],
        isAnonymous: true
      };
    }

    return {
      authenticated: false,
      error: 'Authentication required for MCP operations',
      status: 401
    };
  }

  // If auth header exists, validate it
  const mockRequest = new Request(request.url, {
    ...request,
    headers: {
      ...Object.fromEntries(request.headers),
      'Authorization': authHeader
    }
  });

  return await authenticateRequest(mockRequest, env, []);
}

/**
 * Rate limiting for authenticated users
 * Basic implementation - in production, use Cloudflare Rate Limiting
 *
 * @param {string} userId - User identifier
 * @param {Object} env - Environment variables
 * @returns {Object} Rate limit status
 */
export async function checkRateLimit(userId, env) {
  // Simplified rate limiting - in production, use proper rate limiting
  const limit = env.RATE_LIMIT || 50; // requests per hour
  const window = 60 * 60 * 1000; // 1 hour in milliseconds

  // This is a placeholder - real implementation would use KV or Durable Objects
  // for tracking request counts per user

  return {
    allowed: true,
    remaining: limit - 1,
    resetTime: Date.now() + window
  };
}

/**
 * Log authentication events
 *
 * @param {Object} authResult - Authentication result
 * @param {Request} request - Original request
 */
export function logAuthEvent(authResult, request) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    authenticated: authResult.authenticated,
    user: authResult.user || 'unknown',
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('User-Agent'),
    ip: request.headers.get('CF-Connecting-IP') || 'unknown'
  };

  if (authResult.authenticated) {
    console.log('Authentication successful:', JSON.stringify(logEntry));
  } else {
    console.warn('Authentication failed:', JSON.stringify({
      ...logEntry,
      error: authResult.error
    }));
  }
}

