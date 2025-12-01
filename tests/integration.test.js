/**
 * Integration Tests for Essentia Audio Analysis Service
 *
 * Tests Cloudflare Worker and MCP server integration,
 * audio processing pipeline, and end-to-end workflows.
 */

import { MCPServer } from '../mcp-server.js';
import { handleAudioAnalysis } from '../audio-handler.js';
import { validateToolInput, getToolDefinition } from '../mcp-tools.js';

// Mock Cloudflare environment
const mockEnv = {
  R2_BUCKET: {
    put: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockResolvedValue(null),
    list: jest.fn().mockResolvedValue({ objects: [] }),
    delete: jest.fn().mockResolvedValue(true)
  },
  FRAME_SAMPLE_RATE: '5',
  WORKER_ENV: 'test',
  CF_ACCOUNT_ID: 'test-account-id'
};

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cloudflare Worker Integration', () => {
    test('should handle audio analysis POST request', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          fileUrl: 'https://example.com/test.mp3'
        })
      };

      // Mock fetch for downloading audio
      global.fetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024))
      });

      const response = await handleAudioAnalysis(mockRequest, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('result');
      expect(data).toHaveProperty('fileId');
    });

    test('should reject invalid file URLs', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          fileUrl: 'http://invalid-url.com/file.mp3' // HTTP instead of HTTPS
        })
      };

      const response = await handleAudioAnalysis(mockRequest, mockEnv);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('HTTPS');
    });

    test('should handle download failures', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          fileUrl: 'https://example.com/test.mp3'
        })
      };

      // Mock failed fetch
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const response = await handleAudioAnalysis(mockRequest, mockEnv);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('download');
    });

    test('should upload results to R2', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          fileUrl: 'https://example.com/test.mp3'
        })
      };

      // Mock successful audio download and processing
      global.fetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024))
      });

      // Mock R2 upload
      mockEnv.R2_BUCKET.put.mockResolvedValue({});

      const response = await handleAudioAnalysis(mockRequest, mockEnv);

      expect(response.status).toBe(200);
      expect(mockEnv.R2_BUCKET.put).toHaveBeenCalled();
    });
  });

  describe('MCP Server Integration', () => {
    let mcpServer;

    beforeEach(() => {
      mcpServer = new MCPServer(mockEnv);
    });

    test('should list available tools', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('result');
      expect(data.result).toHaveProperty('tools');
      expect(Array.isArray(data.result.tools)).toBe(true);
      expect(data.result.tools.length).toBeGreaterThan(0);

      // Check for specific tools
      const toolNames = data.result.tools.map(t => t.name);
      expect(toolNames).toContain('analyze_audio');
      expect(toolNames).toContain('extract_beats');
      expect(toolNames).toContain('detect_sections');
    });

    test('should list available resources', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/list',
        params: {}
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('result');
      expect(data.result).toHaveProperty('resources');
      expect(Array.isArray(data.result.resources)).toBe(true);
    });

    test('should handle analyze_audio tool call', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'analyze_audio',
          arguments: {
            fileUrl: 'https://example.com/test.mp3',
            includeMetadata: true
          }
        }
      };

      // Mock the audio handler
      const mockAudioResponse = new Response(JSON.stringify({
        success: true,
        result: { test: 'result' },
        fileId: 'test-file-id'
      }));
      mockAudioResponse.json = jest.fn().mockResolvedValue({
        success: true,
        result: { test: 'result' },
        fileId: 'test-file-id'
      });

      // Mock fetch for R2 results
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify({ metadata: 'test' }))
      });

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('result');
      expect(data.result).toHaveProperty('content');
    });

    test('should handle extract_beats tool call', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'extract_beats',
          arguments: {
            fileUrl: 'https://example.com/test.mp3'
          }
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('result');
      expect(data.result).toHaveProperty('content');
    });

    test('should handle invalid tool calls', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: {}
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('should read resources', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 6,
        method: 'resources/read',
        params: {
          uri: 'essentia://audio/metadata/test-file-id'
        }
      };

      // Mock fetch for resource
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ test: 'metadata' })
      });

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('result');
      expect(data.result).toHaveProperty('contents');
    });
  });

  describe('MCP Tools Validation', () => {
    test('should validate analyze_audio tool input', () => {
      const validInput = {
        fileUrl: 'https://example.com/test.mp3',
        includeMetadata: true
      };

      const result = validateToolInput('analyze_audio', validInput);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid analyze_audio input', () => {
      const invalidInput = {
        // Missing fileUrl
        includeMetadata: true
      };

      const result = validateToolInput('analyze_audio', invalidInput);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('fileUrl');
    });

    test('should validate extract_beats tool input', () => {
      const validInput = {
        fileUrl: 'https://example.com/test.mp3'
      };

      const result = validateToolInput('extract_beats', validInput);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid URLs', () => {
      const invalidInput = {
        fileUrl: 'http://example.com/test.mp3' // HTTP instead of HTTPS
      };

      const result = validateToolInput('analyze_audio', invalidInput);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTPS');
    });

    test('should get tool definitions', () => {
      const definition = getToolDefinition('analyze_audio');
      expect(definition).toBeDefined();
      expect(definition.name).toBe('analyze_audio');

      const nonexistent = getToolDefinition('nonexistent');
      expect(nonexistent).toBeNull();
    });
  });

  describe('End-to-End Workflows', () => {
    test('should complete full audio analysis workflow', async () => {
      // Mock audio file download
      global.fetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(2048))
      });

      // Mock R2 uploads
      mockEnv.R2_BUCKET.put.mockResolvedValue({});

      // Step 1: Analyze audio
      const analyzeRequest = {
        json: jest.fn().mockResolvedValue({
          fileUrl: 'https://example.com/test.mp3'
        })
      };

      const analyzeResponse = await handleAudioAnalysis(analyzeRequest, mockEnv);
      expect(analyzeResponse.status).toBe(200);

      const analyzeData = await analyzeResponse.json();
      expect(analyzeData.success).toBe(true);
      expect(analyzeData.fileId).toBe('mock-uuid-1234');

      // Step 2: Use MCP to get metadata
      const mcpServer = new MCPServer(mockEnv);
      const metadataRequest = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'get_metadata',
          arguments: {
            fileId: analyzeData.fileId,
            metadataType: 'song'
          }
        }
      };

      // Mock fetch for metadata retrieval
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          duration: 10,
          bpm: 120,
          key: 'C major'
        })
      });

      const mockResponse = { json: jest.fn().mockResolvedValue(metadataRequest) };
      const metadataResponse = await mcpServer.handleRequest(mockResponse);

      expect(metadataResponse.status).toBe(200);
    });

    test('should handle workflow errors gracefully', async () => {
      // Mock failed audio download
      global.fetch.mockRejectedValueOnce(new Error('Download failed'));

      const request = {
        json: jest.fn().mockResolvedValue({
          fileUrl: 'https://example.com/test.mp3'
        })
      };

      const response = await handleAudioAnalysis(request, mockEnv);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBeDefined();
    });

    test('should handle MCP protocol errors', async () => {
      const mcpServer = new MCPServer(mockEnv);
      const invalidRequest = {
        jsonrpc: '2.0',
        id: 8,
        method: 'invalid/method',
        params: {}
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(invalidRequest) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('Performance and Limits', () => {
    test('should handle large audio files within limits', async () => {
      // Mock large file download (within limits)
      const largeBuffer = new ArrayBuffer(50 * 1024 * 1024); // 50MB
      global.fetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(largeBuffer)
      });

      mockEnv.R2_BUCKET.put.mockResolvedValue({});

      const request = {
        json: jest.fn().mockResolvedValue({
          fileUrl: 'https://example.com/large.mp3'
        })
      };

      const response = await handleAudioAnalysis(request, mockEnv);
      expect(response.status).toBe(200);
    });

    test('should reject files that are too large', async () => {
      // Mock oversized file
      global.fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-length', '150000000']]), // 150MB
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024))
      });

      const request = {
        json: jest.fn().mockResolvedValue({
          fileUrl: 'https://example.com/too-large.mp3'
        })
      };

      const response = await handleAudioAnalysis(request, mockEnv);
      expect(response.status).toBe(500);
    });

    test('should handle frame sampling configuration', async () => {
      // Test with different frame sampling rates
      const testEnv = { ...mockEnv, FRAME_SAMPLE_RATE: '10' };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024))
      });

      mockEnv.R2_BUCKET.put.mockResolvedValue({});

      const request = {
        json: jest.fn().mockResolvedValue({
          fileUrl: 'https://example.com/test.mp3'
        })
      };

      const response = await handleAudioAnalysis(request, testEnv);
      expect(response.status).toBe(200);
    });
  });
});
