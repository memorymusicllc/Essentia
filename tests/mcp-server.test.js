/**
 * Tests for MCP Server Implementation
 *
 * Tests MCP protocol handling, tool execution, and resource management.
 */

// Mock ES modules for testing
jest.mock('../mcp-server.js', () => ({
  MCPServer: jest.fn().mockImplementation((env, authResult) => ({
    env,
    authResult,
    handleRequest: jest.fn()
  }))
}));

jest.mock('../audio-handler.js', () => ({
  handleAudioAnalysis: jest.fn()
}));

const { MCPServer } = require('../mcp-server.js');
const { handleAudioAnalysis } = require('../audio-handler.js');

// Mock environment
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

describe('MCPServer', () => {
  let mcpServer;

  beforeEach(() => {
    mcpServer = new MCPServer(mockEnv);
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with environment', () => {
      expect(mcpServer.env).toBe(mockEnv);
    });

    test('should have MCP protocol handlers', () => {
      expect(mcpServer.server).toBeDefined();
      expect(typeof mcpServer.handleRequest).toBe('function');
    });
  });

  describe('Tool Listing', () => {
    test('should list all available tools', async () => {
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
      expect(data.result.tools).toHaveLength(5);

      const toolNames = data.result.tools.map(t => t.name);
      expect(toolNames).toEqual([
        'analyze_audio',
        'extract_beats',
        'detect_sections',
        'analyze_psychology',
        'get_metadata'
      ]);
    });

    test('should provide tool schemas', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      const data = await response.json();
      const analyzeTool = data.result.tools.find(t => t.name === 'analyze_audio');

      expect(analyzeTool).toHaveProperty('inputSchema');
      expect(analyzeTool.inputSchema).toHaveProperty('properties');
      expect(analyzeTool.inputSchema.properties).toHaveProperty('fileUrl');
      expect(analyzeTool.inputSchema.properties).toHaveProperty('includeMetadata');
    });
  });

  describe('Resource Listing', () => {
    test('should list available resources', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 3,
        method: 'resources/list',
        params: {}
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result.resources).toHaveLength(4);

      const resourceURIs = data.result.resources.map(r => r.uri);
      expect(resourceURIs).toEqual([
        'essentia://audio/analysis/{fileId}',
        'essentia://audio/metadata/{fileId}',
        'essentia://audio/beats/{fileId}',
        'essentia://audio/sections/{fileId}'
      ]);
    });
  });

  describe('Tool Execution', () => {
    beforeEach(() => {
      // Mock fetch for tool execution
      global.fetch.mockImplementation((url) => {
        if (url.includes('r2.cloudflarestorage.com')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              duration: 10,
              bpm: 120,
              key: 'C major'
            })
          });
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        });
      });
    });

    test('should execute analyze_audio tool', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'analyze_audio',
          arguments: {
            fileUrl: 'https://example.com/test.mp3',
            includeMetadata: true
          }
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toHaveProperty('content');
      expect(data.result.content[0].text).toContain('Audio analysis completed');
    });

    test('should execute extract_beats tool', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 5,
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
      expect(data.result).toHaveProperty('content');
      expect(data.result.content[0].text).toContain('Beat analysis completed');
    });

    test('should execute detect_sections tool', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'detect_sections',
          arguments: {
            fileUrl: 'https://example.com/test.mp3'
          }
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toHaveProperty('content');
      expect(data.result.content[0].text).toContain('Section detection completed');
    });

    test('should execute analyze_psychology tool', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'analyze_psychology',
          arguments: {
            fileUrl: 'https://example.com/test.mp3'
          }
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toHaveProperty('content');
      expect(data.result.content[0].text).toContain('Psychological analysis completed');
    });

    test('should execute get_metadata tool', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'get_metadata',
          arguments: {
            fileId: 'test-file-id',
            metadataType: 'song'
          }
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toHaveProperty('content');
      expect(data.result.content[0].text).toContain('Retrieved song metadata');
    });

    test('should handle tool execution errors', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'analyze_audio',
          arguments: {
            fileUrl: 'http://invalid-url.com/file.mp3' // Invalid URL
          }
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toHaveProperty('content');
      expect(data.result.content[0].text).toContain('Error executing tool');
    });

    test('should handle unknown tools', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toHaveProperty('content');
      expect(data.result.content[0].text).toContain('Unknown tool');
    });
  });

  describe('Resource Reading', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          duration: 10,
          bpm: 120,
          key: 'C major',
          sections: [],
          loops: [],
          beatMarkers: { bpm: 120, beats: [] }
        })
      });
    });

    test('should read metadata resource', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 11,
        method: 'resources/read',
        params: {
          uri: 'essentia://audio/metadata/test-file-id'
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toHaveProperty('contents');
      expect(data.result.contents[0]).toHaveProperty('text');
    });

    test('should read beats resource', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 12,
        method: 'resources/read',
        params: {
          uri: 'essentia://audio/beats/test-file-id'
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toHaveProperty('contents');
    });

    test('should read sections resource', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 13,
        method: 'resources/read',
        params: {
          uri: 'essentia://audio/sections/test-file-id'
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toHaveProperty('contents');
    });

    test('should handle resource read errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });

      const request = {
        jsonrpc: '2.0',
        id: 14,
        method: 'resources/read',
        params: {
          uri: 'essentia://audio/metadata/nonexistent-file'
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('should handle invalid resource URIs', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 15,
        method: 'resources/read',
        params: {
          uri: 'invalid://uri'
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('MCP Protocol Compliance', () => {
    test('should respond with proper JSON-RPC format', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 16,
        method: 'tools/list',
        params: {}
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('jsonrpc', '2.0');
      expect(data).toHaveProperty('id', 16);
      expect(data).toHaveProperty('result');
    });

    test('should handle malformed requests', async () => {
      const malformedRequest = {
        invalid: 'request'
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(malformedRequest) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('should handle method not found', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 17,
        method: 'nonexistent/method',
        params: {}
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network failure'));

      const request = {
        jsonrpc: '2.0',
        id: 18,
        method: 'tools/call',
        params: {
          name: 'analyze_audio',
          arguments: {
            fileUrl: 'https://example.com/test.mp3'
          }
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toHaveProperty('isError', true);
    });

    test('should handle invalid tool arguments', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 19,
        method: 'tools/call',
        params: {
          name: 'analyze_audio',
          arguments: {
            // Missing fileUrl
            includeMetadata: true
          }
        }
      };

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toHaveProperty('isError', true);
    });

    test('should handle R2 storage errors', async () => {
      mockEnv.R2_BUCKET.put.mockRejectedValueOnce(new Error('Storage error'));

      const request = {
        jsonrpc: '2.0',
        id: 20,
        method: 'tools/call',
        params: {
          name: 'analyze_audio',
          arguments: {
            fileUrl: 'https://example.com/test.mp3'
          }
        }
      };

      // Mock successful download but failed storage
      global.fetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      });

      const mockResponse = { json: jest.fn().mockResolvedValue(request) };
      const response = await mcpServer.handleRequest(mockResponse);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result).toHaveProperty('isError', true);
    });
  });
});
