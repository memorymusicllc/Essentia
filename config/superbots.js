/**
 * SuperBots.link Integration Configuration
 *
 * Handles authentication, service registration, and power pass validation
 * for the config.superbots.link ecosystem.
 *
 * @module config/superbots
 */

/**
 * Service definition for Essentia Audio Analysis
 * Compatible with config.superbots.link Node schema
 */
export const SERVICE_DEFINITION = {
  id: 'essentia-audio-analysis',
  type: 'audio-analysis',
  version: '1.0.0',
  name: 'Essentia Audio Analysis Service',
  description: 'Comprehensive audio feature extraction with beat markers, section detection, and songwriting metadata',

  // Input/Output specification
  io: {
    inputs: [
      {
        name: 'fileUrl',
        dtype: 'string',
        description: 'HTTPS URL to audio file for analysis',
        validationRule: 'isUrl:https'
      },
      {
        name: 'includeMetadata',
        dtype: 'boolean',
        description: 'Include enhanced songwriting metadata',
        validationRule: 'isBoolean',
        default: true
      },
      {
        name: 'analysisType',
        dtype: 'string',
        description: 'Type of analysis (full, beats, sections, psychology)',
        validationRule: 'isIn:full,beats,sections,psychology',
        default: 'full'
      }
    ],
    outputs: [
      {
        name: 'result',
        dtype: 'object',
        description: 'Analysis results with file URLs and metadata'
      },
      {
        name: 'metadata',
        dtype: 'object',
        description: 'Enhanced metadata at song/section/loop levels'
      }
    ]
  },

  // Agent directives for service behavior
  agentDirectives: {
    capabilities: [
      'audio-analysis',
      'beat-detection',
      'section-detection',
      'songwriting-metadata',
      'psychological-analysis',
      'mcp-server'
    ],
    protocols: ['http', 'mcp'],
    authentication: 'power-pass',
    rateLimit: '50/hour',
    timeout: 300, // 5 minutes max processing time
    retryPolicy: {
      maxRetries: 3,
      backoff: 'exponential'
    }
  },

  // Service endpoints
  endpoints: {
    http: 'https://essentia.yourdomain.com',
    mcp: 'https://essentia.yourdomain.com/mcp',
    health: 'https://essentia.yourdomain.com/health'
  },

  // Observability configuration
  observability: {
    metrics: ['requests', 'processing_time', 'error_rate', 'storage_used'],
    logs: ['access', 'error', 'performance'],
    alerts: ['high_error_rate', 'slow_processing', 'storage_full']
  },

  // Metadata for service discovery
  metadata: {
    category: 'audio-processing',
    tags: ['music', 'analysis', 'essentia', 'wasm', 'mcp'],
    maintainer: 'Mansoor',
    repository: 'https://github.com/memorymusicllc/Essentia',
    license: 'ISC',
    pricing: {
      freeTier: '50 files/hour',
      paidTier: '$5/month for 36,000 files/month'
    }
  }
};

/**
 * Power Pass authentication configuration
 */
export const POWER_PASS_CONFIG = {
  issuer: 'superbots.link',
  audience: 'essentia-audio-analysis',
  algorithms: ['RS256', 'ES256'],
  tokenEndpoint: 'https://auth.superbots.link/oauth/token',
  jwksEndpoint: 'https://auth.superbots.link/.well-known/jwks.json',
  scopes: [
    'audio:analyze',
    'metadata:read',
    'beats:extract',
    'sections:detect',
    'psychology:analyze'
  ]
};

/**
 * Service registration configuration
 */
export const REGISTRY_CONFIG = {
  endpoint: 'https://registry.superbots.link/services',
  schemaVersion: 'v3',
  heartbeatInterval: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 5000 // 5 seconds
};

/**
 * Validate power pass token
 *
 * @param {string} token - Power pass JWT token
 * @returns {Promise<Object>} Decoded token payload
 */
export async function validatePowerPass(token) {
  try {
    // Verify JWT token structure (simplified implementation)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }

    // Decode payload (base64url)
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    // Basic validation
    if (!payload.sub || !payload.exp || !payload.iss) {
      throw new Error('Invalid token payload');
    }

    // Check expiration
    if (Date.now() >= payload.exp * 1000) {
      throw new Error('Token expired');
    }

    // Check issuer
    if (payload.iss !== POWER_PASS_CONFIG.issuer) {
      throw new Error('Invalid token issuer');
    }

    // Check audience
    if (payload.aud !== POWER_PASS_CONFIG.audience) {
      throw new Error('Invalid token audience');
    }

    return payload;

  } catch (error) {
    console.error('Power pass validation error:', error);
    throw new Error(`Power pass validation failed: ${error.message}`);
  }
}

/**
 * Register service with config.superbots.link
 *
 * @param {Object} env - Environment variables
 * @returns {Promise<Object>} Registration response
 */
export async function registerService(env) {
  try {
    const registrationPayload = {
      ...SERVICE_DEFINITION,
      deployment: {
        platform: 'cloudflare-workers',
        region: 'global',
        environment: env.WORKER_ENV || 'production',
        version: SERVICE_DEFINITION.version
      },
      powerPass: {
        required: true,
        scopes: POWER_PASS_CONFIG.scopes
      }
    };

    // In production, this would make an actual HTTP request
    // For now, return the registration payload
    console.log('Service registration payload:', JSON.stringify(registrationPayload, null, 2));

    // Simulate successful registration
    return {
      success: true,
      serviceId: SERVICE_DEFINITION.id,
      registeredAt: new Date().toISOString(),
      endpoints: SERVICE_DEFINITION.endpoints,
      status: 'active'
    };

  } catch (error) {
    console.error('Service registration error:', error);
    throw new Error(`Service registration failed: ${error.message}`);
  }
}

/**
 * Send heartbeat to registry
 *
 * @param {string} serviceId - Registered service ID
 * @returns {Promise<Object>} Heartbeat response
 */
export async function sendHeartbeat(serviceId) {
  try {
    const heartbeatPayload = {
      serviceId: serviceId,
      timestamp: new Date().toISOString(),
      status: 'healthy',
      metrics: {
        uptime: Date.now(), // Simplified uptime tracking
        activeConnections: 0, // Would be tracked in real implementation
        queueLength: 0
      }
    };

    // In production, send to registry endpoint
    console.log('Heartbeat sent:', JSON.stringify(heartbeatPayload, null, 2));

    return {
      success: true,
      acknowledged: true
    };

  } catch (error) {
    console.error('Heartbeat error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check service permissions for user
 *
 * @param {Object} tokenPayload - Decoded power pass token
 * @param {string} requiredScope - Required permission scope
 * @returns {boolean} True if user has permission
 */
export function checkPermissions(tokenPayload, requiredScope) {
  try {
    // Check if token has required scope
    const userScopes = tokenPayload.scopes || [];
    return userScopes.includes(requiredScope) ||
           userScopes.includes('*') || // Wildcard permission
           userScopes.includes('admin'); // Admin permission

  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Get service health status for registry
 *
 * @param {Object} env - Environment variables
 * @returns {Object} Health status
 */
export function getServiceHealth(env) {
  return {
    service: SERVICE_DEFINITION.id,
    version: SERVICE_DEFINITION.version,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.WORKER_ENV || 'production',
    platform: 'cloudflare-workers',
    capabilities: SERVICE_DEFINITION.agentDirectives.capabilities,
    endpoints: SERVICE_DEFINITION.endpoints,
    metrics: {
      frameSampleRate: env.FRAME_SAMPLE_RATE || '5',
      workerEnv: env.WORKER_ENV || 'production'
    }
  };
}

