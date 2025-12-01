/**
 * Service Registry Utilities
 *
 * Handles service registration, discovery, and health monitoring
 * for the config.superbots.link ecosystem.
 *
 * @module utils/service-registry
 */

import { registerService, sendHeartbeat, getServiceHealth, REGISTRY_CONFIG } from '../config/superbots.js';

/**
 * Service registry client
 */
export class ServiceRegistry {
  constructor(env) {
    this.env = env;
    this.serviceId = null;
    this.registered = false;
    this.lastHeartbeat = null;
    this.heartbeatInterval = null;
  }

  /**
   * Register service with registry
   *
   * @returns {Promise<Object>} Registration result
   */
  async register() {
    try {
      console.log('Registering service with config.superbots.link...');

      const result = await registerService(this.env);

      this.serviceId = result.serviceId;
      this.registered = true;

      console.log('Service registered successfully:', result);

      // Start heartbeat
      this.startHeartbeat();

      return result;

    } catch (error) {
      console.error('Service registration failed:', error);
      this.registered = false;
      throw error;
    }
  }

  /**
   * Unregister service from registry
   *
   * @returns {Promise<Object>} Unregistration result
   */
  async unregister() {
    try {
      if (!this.registered) {
        return { success: true, message: 'Service not registered' };
      }

      // Stop heartbeat
      this.stopHeartbeat();

      // In production, this would call the registry API
      console.log('Unregistering service:', this.serviceId);

      this.registered = false;
      this.serviceId = null;

      return {
        success: true,
        message: 'Service unregistered successfully'
      };

    } catch (error) {
      console.error('Service unregistration failed:', error);
      throw error;
    }
  }

  /**
   * Start heartbeat timer
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        if (this.registered && this.serviceId) {
          await this.sendHeartbeat();
        }
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, REGISTRY_CONFIG.heartbeatInterval);

    console.log('Heartbeat started, interval:', REGISTRY_CONFIG.heartbeatInterval);
  }

  /**
   * Stop heartbeat timer
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('Heartbeat stopped');
    }
  }

  /**
   * Send heartbeat to registry
   *
   * @returns {Promise<Object>} Heartbeat result
   */
  async sendHeartbeat() {
    try {
      const result = await sendHeartbeat(this.serviceId);
      this.lastHeartbeat = new Date().toISOString();

      return result;

    } catch (error) {
      console.error('Heartbeat send failed:', error);
      throw error;
    }
  }

  /**
   * Get service health status
   *
   * @returns {Object} Health status
   */
  getHealth() {
    return {
      ...getServiceHealth(this.env),
      registered: this.registered,
      serviceId: this.serviceId,
      lastHeartbeat: this.lastHeartbeat,
      uptime: this.registered ? Date.now() - (this.registrationTime || Date.now()) : 0
    };
  }

  /**
   * Discover services in the registry
   *
   * @param {Object} filters - Discovery filters
   * @returns {Promise<Array>} Discovered services
   */
  async discoverServices(filters = {}) {
    try {
      // In production, this would query the registry API
      // For now, return mock data

      const mockServices = [
        {
          id: 'essentia-audio-analysis',
          name: 'Essentia Audio Analysis Service',
          type: 'audio-analysis',
          version: '1.0.0',
          status: 'active',
          endpoints: {
            http: 'https://essentia.yourdomain.com',
            mcp: 'https://essentia.yourdomain.com/mcp'
          }
        }
      ];

      // Apply filters
      let filteredServices = mockServices;

      if (filters.type) {
        filteredServices = filteredServices.filter(s => s.type === filters.type);
      }

      if (filters.capability) {
        filteredServices = filteredServices.filter(s =>
          s.capabilities && s.capabilities.includes(filters.capability)
        );
      }

      return filteredServices;

    } catch (error) {
      console.error('Service discovery failed:', error);
      throw error;
    }
  }

  /**
   * Update service metadata
   *
   * @param {Object} updates - Metadata updates
   * @returns {Promise<Object>} Update result
   */
  async updateMetadata(updates) {
    try {
      if (!this.registered) {
        throw new Error('Service not registered');
      }

      // In production, this would call the registry API
      console.log('Updating service metadata:', updates);

      return {
        success: true,
        updated: updates,
        updatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Metadata update failed:', error);
      throw error;
    }
  }
}

/**
 * Service discovery client
 */
export class ServiceDiscovery {
  constructor(env) {
    this.env = env;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Find service by type and capabilities
   *
   * @param {string} serviceType - Type of service to find
   * @param {Array} capabilities - Required capabilities
   * @returns {Promise<Array>} Matching services
   */
  async findServices(serviceType, capabilities = []) {
    try {
      const cacheKey = `${serviceType}:${capabilities.join(',')}`;

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.services;
      }

      // Query registry
      const registry = new ServiceRegistry(this.env);
      const services = await registry.discoverServices({
        type: serviceType,
        capabilities: capabilities
      });

      // Cache results
      this.cache.set(cacheKey, {
        services: services,
        timestamp: Date.now()
      });

      return services;

    } catch (error) {
      console.error('Service discovery failed:', error);
      throw error;
    }
  }

  /**
   * Get service endpoint by ID
   *
   * @param {string} serviceId - Service ID
   * @param {string} endpointType - Type of endpoint (http, mcp, etc.)
   * @returns {Promise<string|null>} Service endpoint URL
   */
  async getServiceEndpoint(serviceId, endpointType = 'http') {
    try {
      const services = await this.findServices();
      const service = services.find(s => s.id === serviceId);

      if (!service || !service.endpoints) {
        return null;
      }

      return service.endpoints[endpointType] || null;

    } catch (error) {
      console.error('Failed to get service endpoint:', error);
      return null;
    }
  }

  /**
   * Clear discovery cache
   */
  clearCache() {
    this.cache.clear();
    console.log('Service discovery cache cleared');
  }
}

/**
 * Global service registry instance
 * In a Workers environment, this would be shared across requests
 */
let globalRegistry = null;

/**
 * Get or create global service registry
 *
 * @param {Object} env - Environment variables
 * @returns {ServiceRegistry} Global registry instance
 */
export function getGlobalRegistry(env) {
  if (!globalRegistry) {
    globalRegistry = new ServiceRegistry(env);
  }
  return globalRegistry;
}

/**
 * Initialize service registry on startup
 *
 * @param {Object} env - Environment variables
 * @returns {Promise<Object>} Initialization result
 */
export async function initializeRegistry(env) {
  try {
    const registry = getGlobalRegistry(env);

    // Auto-register if not already registered
    if (!registry.registered) {
      await registry.register();
    }

    return {
      success: true,
      serviceId: registry.serviceId,
      status: 'registered'
    };

  } catch (error) {
    console.error('Registry initialization failed:', error);
    return {
      success: false,
      error: error.message,
      status: 'failed'
    };
  }
}

/**
 * Health check for service registry
 *
 * @param {Object} env - Environment variables
 * @returns {Object} Registry health status
 */
export function getRegistryHealth(env) {
  const registry = getGlobalRegistry(env);

  return {
    registry: {
      registered: registry.registered,
      serviceId: registry.serviceId,
      lastHeartbeat: registry.lastHeartbeat,
      heartbeatActive: registry.heartbeatInterval !== null
    },
    config: REGISTRY_CONFIG
  };
}

