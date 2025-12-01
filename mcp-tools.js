/**
 * MCP Tools for Essentia Audio Analysis
 *
 * Defines specific tools available through the MCP server interface.
 * Each tool provides focused audio analysis capabilities.
 *
 * @module mcp-tools
 */

/**
 * Tool: Analyze Audio File
 * Performs comprehensive audio analysis including all features
 *
 * @param {string} fileUrl - HTTPS URL to audio file
 * @param {boolean} includeMetadata - Whether to include enhanced metadata
 * @returns {Object} Analysis results
 */
export async function analyzeAudio(fileUrl, includeMetadata = true) {
  // Implementation delegated to audio-handler.js
  // This is a placeholder for tool-specific logic
  return {
    tool: 'analyze_audio',
    fileUrl,
    includeMetadata,
    status: 'delegated_to_handler'
  };
}

/**
 * Tool: Extract Beat Markers
 * Focuses specifically on beat detection and tempo analysis
 *
 * @param {string} fileUrl - HTTPS URL to audio file
 * @returns {Object} Beat analysis results
 */
export async function extractBeats(fileUrl) {
  return {
    tool: 'extract_beats',
    fileUrl,
    focus: 'beat_detection',
    features: [
      'beat_positions',
      'tempo_estimation',
      'beat_confidence',
      'rhythm_analysis'
    ]
  };
}

/**
 * Tool: Detect Song Sections
 * Analyzes structural changes to identify song sections
 *
 * @param {string} fileUrl - HTTPS URL to audio file
 * @returns {Object} Section detection results
 */
export async function detectSections(fileUrl) {
  return {
    tool: 'detect_sections',
    fileUrl,
    analysis_type: 'structural_segmentation',
    section_types: [
      'intro',
      'verse',
      'chorus',
      'bridge',
      'outro'
    ],
    features: [
      'energy_changes',
      'tempo_transitions',
      'harmonic_shifts',
      'timbre_variations'
    ]
  };
}

/**
 * Tool: Analyze Psychological Descriptors
 * Extracts emotional and psychological features from audio
 *
 * @param {string} fileUrl - HTTPS URL to audio file
 * @returns {Object} Psychological analysis results
 */
export async function analyzePsychology(fileUrl) {
  return {
    tool: 'analyze_psychology',
    fileUrl,
    descriptors: [
      'valence',           // positive/negative emotion
      'arousal',           // energy/intensity
      'emotional_trajectory',
      'paradigm_shifts',   // sudden emotional changes
      'mood_categories'
    ],
    methodology: [
      'danceability_correlation',
      'energy_analysis',
      'tempo_patterns',
      'harmonic_progressions'
    ]
  };
}

/**
 * Tool: Get Stored Metadata
 * Retrieves previously analyzed metadata from storage
 *
 * @param {string} fileId - File ID from previous analysis
 * @param {string} metadataType - Type of metadata to retrieve
 * @returns {Object} Retrieved metadata
 */
export async function getMetadata(fileId, metadataType = 'all') {
  return {
    tool: 'get_metadata',
    fileId,
    metadataType,
    available_types: [
      'song',        // Overall song analysis
      'sections',    // Section-level metadata
      'loops',       // Loop-level metadata
      'beatMarkers', // Beat positions and tempo
      'all'          // Complete metadata structure
    ]
  };
}

/**
 * Tool definitions for MCP server registration
 */
export const MCP_TOOL_DEFINITIONS = [
  {
    name: 'analyze_audio',
    description: 'Analyze audio file from URL and extract comprehensive audio features including beat markers, sections, and metadata',
    inputSchema: {
      type: 'object',
      properties: {
        fileUrl: {
          type: 'string',
          description: 'HTTPS URL to audio file to analyze'
        },
        includeMetadata: {
          type: 'boolean',
          description: 'Include enhanced songwriting metadata (default: true)',
          default: true
        }
      },
      required: ['fileUrl']
    }
  },
  {
    name: 'extract_beats',
    description: 'Extract beat positions and tempo from audio file',
    inputSchema: {
      type: 'object',
      properties: {
        fileUrl: {
          type: 'string',
          description: 'HTTPS URL to audio file'
        }
      },
      required: ['fileUrl']
    }
  },
  {
    name: 'detect_sections',
    description: 'Detect song sections (verse, chorus, bridge, etc.) from audio',
    inputSchema: {
      type: 'object',
      properties: {
        fileUrl: {
          type: 'string',
          description: 'HTTPS URL to audio file'
        }
      },
      required: ['fileUrl']
    }
  },
  {
    name: 'analyze_psychology',
    description: 'Extract psychological descriptors (valence, arousal, emotional trajectory) from audio',
    inputSchema: {
      type: 'object',
      properties: {
        fileUrl: {
          type: 'string',
          description: 'HTTPS URL to audio file'
        }
      },
      required: ['fileUrl']
    }
  },
  {
    name: 'get_metadata',
    description: 'Retrieve stored analysis metadata for a processed file',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: {
          type: 'string',
          description: 'File ID from previous analysis'
        },
        metadataType: {
          type: 'string',
          enum: ['song', 'sections', 'loops', 'beatMarkers', 'all'],
          description: 'Type of metadata to retrieve',
          default: 'all'
        }
      },
      required: ['fileId']
    }
  }
];

/**
 * Resource definitions for MCP server
 */
export const MCP_RESOURCE_DEFINITIONS = [
  {
    uri: 'essentia://audio/analysis/{fileId}',
    name: 'Audio Analysis Results',
    description: 'Complete audio analysis results for a processed file',
    mimeType: 'application/json'
  },
  {
    uri: 'essentia://audio/metadata/{fileId}',
    name: 'Enhanced Metadata',
    description: 'Songwriting metadata including sections, loops, and psychological analysis',
    mimeType: 'application/json'
  },
  {
    uri: 'essentia://audio/beats/{fileId}',
    name: 'Beat Markers',
    description: 'Beat positions and tempo information',
    mimeType: 'application/json'
  },
  {
    uri: 'essentia://audio/sections/{fileId}',
    name: 'Song Sections',
    description: 'Detected song sections (verse, chorus, bridge, etc.)',
    mimeType: 'application/json'
  }
];

/**
 * Utility function to validate tool inputs
 *
 * @param {string} toolName - Name of the tool
 * @param {Object} args - Tool arguments
 * @returns {Object} Validation result
 */
export function validateToolInput(toolName, args) {
  const definition = MCP_TOOL_DEFINITIONS.find(def => def.name === toolName);

  if (!definition) {
    return { valid: false, error: `Unknown tool: ${toolName}` };
  }

  // Basic validation
  const required = definition.inputSchema.required || [];

  for (const field of required) {
    if (!(field in args)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Type validation
  for (const [field, schema] of Object.entries(definition.inputSchema.properties)) {
    if (field in args) {
      const value = args[field];
      const expectedType = schema.type;

      if (expectedType === 'string' && typeof value !== 'string') {
        return { valid: false, error: `Field ${field} must be a string` };
      }

      if (expectedType === 'boolean' && typeof value !== 'boolean') {
        return { valid: false, error: `Field ${field} must be a boolean` };
      }

      // URL validation for fileUrl
      if (field === 'fileUrl' && value) {
        try {
          const url = new URL(value);
          if (url.protocol !== 'https:') {
            return { valid: false, error: 'fileUrl must use HTTPS protocol' };
          }
        } catch {
          return { valid: false, error: 'fileUrl must be a valid URL' };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Get tool definition by name
 *
 * @param {string} toolName - Name of the tool
 * @returns {Object|null} Tool definition or null if not found
 */
export function getToolDefinition(toolName) {
  return MCP_TOOL_DEFINITIONS.find(def => def.name === toolName) || null;
}

/**
 * Get all tool definitions
 *
 * @returns {Array} Array of all tool definitions
 */
export function getAllToolDefinitions() {
  return MCP_TOOL_DEFINITIONS;
}

/**
 * Get resource definition by URI pattern
 *
 * @param {string} uriPattern - URI pattern to match
 * @returns {Object|null} Resource definition or null if not found
 */
export function getResourceDefinition(uriPattern) {
  return MCP_RESOURCE_DEFINITIONS.find(def => def.uri === uriPattern) || null;
}

/**
 * Get all resource definitions
 *
 * @returns {Array} Array of all resource definitions
 */
export function getAllResourceDefinitions() {
  return MCP_RESOURCE_DEFINITIONS;
}




