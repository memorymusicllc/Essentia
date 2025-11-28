/**
 * Configuration Module
 * 
 * Central export point for all configuration modules.
 * Currently exports GCP configuration.
 * 
 * @module config
 */

module.exports = {
    ...require('./gcpConfig')
}