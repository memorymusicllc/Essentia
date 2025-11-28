/**
 * Google Cloud Platform Configuration
 * 
 * Configures and exports Google Cloud Storage client for storing audio analysis results.
 * Requires service account credentials to be provided via environment variable.
 * 
 * @module config/gcpConfig
 */

const { Storage } = require('@google-cloud/storage')

// Parse service account key from environment variable
// Expected format: JSON string containing GCP service account credentials
let service_key = JSON.parse(process?.env?.service_key || '{}')

// Extract project ID from service account key
const projectId = service_key?.project_id

// Initialize Google Cloud Storage client with service account credentials
// If service_key is empty, Storage will attempt to use default credentials
const storage = new Storage({ 
  projectId, 
  credentials: service_key 
})

module.exports = {
    storage,        // Google Cloud Storage client instance
    projectId,      // GCP project ID
    service_key     // Service account credentials object
}
