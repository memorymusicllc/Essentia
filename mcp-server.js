/**
 * MCP Server Implementation for Essentia Audio Analysis
 *
 * Provides Model Context Protocol (MCP) interface for audio analysis tools.
 * Supports tools, resources, and prompts for audio processing workflows.
 *
 * @module mcp-server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { handleAudioAnalysis } from './audio-handler.js';
import * as audioTools from './mcp-tools.js';

/**
 * MCP Server class for Essentia audio analysis
 */
export class MCPServer {
  constructor(env, authResult = null) {
    this.env = env;
    this.authResult = authResult;
    this.server = new Server(
      {
        name: 'essentia-audio-analysis',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Set up MCP protocol handlers
   */
  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
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
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'analyze_audio':
            return await this.handleAnalyzeAudio(args);
          case 'extract_beats':
            return await this.handleExtractBeats(args);
          case 'detect_sections':
            return await this.handleDetectSections(args);
          case 'analyze_psychology':
            return await this.handleAnalyzePsychology(args);
          case 'get_metadata':
            return await this.handleGetMetadata(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
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
        ]
      };
    });

    // Read resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      try {
        const result = await this.handleReadResource(uri);
        return {
          contents: [
            {
              uri: uri,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        throw new Error(`Failed to read resource ${uri}: ${error.message}`);
      }
    });
  }

  /**
   * Handle audio analysis tool call
   */
  async handleAnalyzeAudio(args) {
    const { fileUrl, includeMetadata = true } = args;

    // Create a mock request object for the audio handler
    const mockRequest = {
      json: async () => ({ fileUrl })
    };

    const response = await handleAudioAnalysis(mockRequest, this.env);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Audio analysis completed successfully. File ID: ${data.fileId}`
        },
        {
          type: 'text',
          text: `Results available at: ${Object.values(data.result).slice(0, 3).join(', ')}...`
        },
        {
          type: 'text',
          text: `Metadata includes: ${includeMetadata ? 'song structure, beat markers, sections, psychological analysis' : 'basic audio features'}`
        }
      ]
    };
  }

  /**
   * Handle beat extraction tool call
   */
  async handleExtractBeats(args) {
    const { fileUrl } = args;

    // Create mock request and analyze
    const mockRequest = { json: async () => ({ fileUrl }) };
    const response = await handleAudioAnalysis(mockRequest, this.env);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    const metadata = data.result.metadata ? JSON.parse(await fetch(data.result.metadata).then(r => r.text())) : null;

    if (!metadata || !metadata.beatMarkers) {
      throw new Error('Beat markers not available in analysis results');
    }

    return {
      content: [
        {
          type: 'text',
          text: `Beat analysis completed for file ${data.fileId}`
        },
        {
          type: 'text',
          text: `Estimated BPM: ${metadata.beatMarkers.bpm}`
        },
        {
          type: 'text',
          text: `Total beats detected: ${metadata.beatMarkers.totalBeats}`
        },
        {
          type: 'text',
          text: `Beat positions: ${metadata.beatMarkers.beats.slice(0, 10).join(', ')}${metadata.beatMarkers.beats.length > 10 ? '...' : ''}`
        }
      ]
    };
  }

  /**
   * Handle section detection tool call
   */
  async handleDetectSections(args) {
    const { fileUrl } = args;

    const mockRequest = { json: async () => ({ fileUrl }) };
    const response = await handleAudioAnalysis(mockRequest, this.env);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    const metadata = data.result.metadata ? JSON.parse(await fetch(data.result.metadata).then(r => r.text())) : null;

    if (!metadata || !metadata.sections) {
      throw new Error('Section detection not available in analysis results');
    }

    const sections = metadata.sections.map(section =>
      `${section.type} (${section.start.toFixed(1)}s - ${section.end.toFixed(1)}s, confidence: ${(section.confidence * 100).toFixed(1)}%)`
    ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Section detection completed for file ${data.fileId}`
        },
        {
          type: 'text',
          text: `Detected ${metadata.sections.length} sections:`
        },
        {
          type: 'text',
          text: sections
        }
      ]
    };
  }

  /**
   * Handle psychological analysis tool call
   */
  async handleAnalyzePsychology(args) {
    const { fileUrl } = args;

    const mockRequest = { json: async () => ({ fileUrl }) };
    const response = await handleAudioAnalysis(mockRequest, this.env);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    const metadata = data.result.metadata ? JSON.parse(await fetch(data.result.metadata).then(r => r.text())) : null;

    if (!metadata || !metadata.song.psychological) {
      throw new Error('Psychological analysis not available in analysis results');
    }

    const psych = metadata.song.psychological;

    return {
      content: [
        {
          type: 'text',
          text: `Psychological analysis completed for file ${data.fileId}`
        },
        {
          type: 'text',
          text: `Overall valence (emotion): ${(psych.overallValence * 100).toFixed(1)}% positive`
        },
        {
          type: 'text',
          text: `Overall arousal (energy): ${(psych.overallArousal * 100).toFixed(1)}% high`
        },
        {
          type: 'text',
          text: `Paradigm shifts detected: ${psych.paradigmShifts.length}`
        },
        {
          type: 'text',
          text: `Emotional trajectory points: ${psych.emotionalTrajectory.length}`
        }
      ]
    };
  }

  /**
   * Handle metadata retrieval tool call
   */
  async handleGetMetadata(args) {
    const { fileId, metadataType = 'all' } = args;

    try {
      const metadataUrl = `https://${this.env.CF_ACCOUNT_ID || 'your-account-id'}.r2.cloudflarestorage.com/essentiajs/analytics/audio/${fileId}/metadata.json`;
      const response = await fetch(metadataUrl);

      if (!response.ok) {
        throw new Error('Metadata not found for this file ID');
      }

      const metadata = await response.json();

      let result;
      switch (metadataType) {
        case 'song':
          result = metadata.song;
          break;
        case 'sections':
          result = metadata.sections;
          break;
        case 'loops':
          result = metadata.loops;
          break;
        case 'beatMarkers':
          result = metadata.beatMarkers;
          break;
        default:
          result = metadata;
      }

      return {
        content: [
          {
            type: 'text',
            text: `Retrieved ${metadataType} metadata for file ${fileId}`
          },
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

    } catch (error) {
      throw new Error(`Failed to retrieve metadata: ${error.message}`);
    }
  }

  /**
   * Handle resource reading
   */
  async handleReadResource(uri) {
    const match = uri.match(/essentia:\/\/audio\/(\w+)\/(.+)/);
    if (!match) {
      throw new Error('Invalid resource URI');
    }

    const [, resourceType, fileId] = match;

    const metadataUrl = `https://${this.env.CF_ACCOUNT_ID || 'your-account-id'}.r2.cloudflarestorage.com/essentiajs/analytics/audio/${fileId}/metadata.json`;
    const response = await fetch(metadataUrl);

    if (!response.ok) {
      throw new Error('Resource not found');
    }

    const metadata = await response.json();

    switch (resourceType) {
      case 'analysis':
        // Return full analysis results
        const analysisUrl = `https://${this.env.CF_ACCOUNT_ID || 'your-account-id'}.r2.cloudflarestorage.com/essentiajs/analytics/audio/${fileId}/fft.json`;
        const analysisResponse = await fetch(analysisUrl);
        return await analysisResponse.json();

      case 'metadata':
        return metadata;

      case 'beats':
        return metadata.beatMarkers || { error: 'Beat markers not available' };

      case 'sections':
        return metadata.sections || [];

      default:
        throw new Error('Unknown resource type');
    }
  }

  /**
   * Handle incoming MCP request
   */
  async handleRequest(request) {
    // Convert Cloudflare Request to MCP format
    const body = await request.text();
    const mcpRequest = JSON.parse(body);

    // Process through MCP server
    const response = await this.server.processRequest(mcpRequest);

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  /**
   * Start MCP server (for stdio transport if needed)
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP server started');
  }
}

// MCPServer class is already exported via 'export class MCPServer'
