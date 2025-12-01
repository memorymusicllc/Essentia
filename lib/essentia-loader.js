/**
 * Custom Essentia.js Loader for Cloudflare Workers
 * 
 * Loads Essentia.js ES modules directly to avoid UMD/eval issues
 * This bypasses the main package entry point that uses UMD builds
 * 
 * CRITICAL: Pre-initializes WASM module using top-level await for Cloudflare Workers
 * Cloudflare Workers doesn't allow synchronous WASM instantiation (WebAssembly.Module/Instance),
 * so we must use WebAssembly.instantiate() and initialize before Essentia tries to use it.
 */

// CRITICAL: We must initialize WASM BEFORE importing the module
// because the module executes top-level code on import
// Use dynamic import to control timing
const wasmModulePromise = import('essentia.js/dist/essentia-wasm.es.js');
const coreModulePromise = import('essentia.js/dist/essentia.js-core.es.js');

// Helper to parse data URI and extract binary
function parseDataURI(dataURI) {
  if (!dataURI || !dataURI.startsWith('data:')) {
    return null;
  }
  
  // Extract base64 part
  const base64Index = dataURI.indexOf('base64,');
  if (base64Index === -1) {
    return null;
  }
  
  const base64Data = dataURI.substring(base64Index + 7);
  
  // Decode base64 to binary
  // In Cloudflare Workers, we can use atob or TextDecoder
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error('Error parsing data URI:', e);
    return null;
  }
}

// Pre-initialize WASM module BEFORE the module executes its top-level code
// This ensures WASM is ready when the module accesses it
let EssentiaWASM;
let Essentia;

// Initialize WASM, then import modules
const initPromise = (async () => {
  // First, dynamically import the module to get access to getBinary
  const wasmModule = await wasmModulePromise;
  const coreModule = await coreModulePromise;
  const EssentiaWASMRaw = wasmModule.EssentiaWASM || wasmModule.Module || wasmModule;
  Essentia = coreModule.default || coreModule.Essentia || coreModule;
  
  // Set up Module on globalThis BEFORE the module's top-level code executes
  const Module = EssentiaWASMRaw.Module || EssentiaWASMRaw;
  if (typeof globalThis !== 'undefined') {
    if (!globalThis.Module) {
      globalThis.Module = Module || {};
    }
  }
  
  try {
    if (EssentiaWASMRaw && typeof EssentiaWASMRaw === 'object') {
    let binary = null;
    
    // Try to get binary from various sources
    // 1. Check if wasmBinary is already set
    if (EssentiaWASMRaw.wasmBinary) {
      binary = EssentiaWASMRaw.wasmBinary instanceof Uint8Array 
        ? EssentiaWASMRaw.wasmBinary 
        : new Uint8Array(EssentiaWASMRaw.wasmBinary);
    }
    // 2. Check wasmBinaryFile (data URI)
    else if (EssentiaWASMRaw.wasmBinaryFile) {
      binary = parseDataURI(EssentiaWASMRaw.wasmBinaryFile);
    }
    // 3. Try getBinary function
    else if (typeof EssentiaWASMRaw.getBinary === 'function') {
      try {
        binary = EssentiaWASMRaw.getBinary();
        if (binary && !(binary instanceof Uint8Array)) {
          binary = new Uint8Array(binary);
        }
      } catch (e) {
        console.warn('getBinary() failed:', e.message);
      }
    }
    
    // If we have binary, initialize WASM
    if (binary && binary instanceof Uint8Array && binary.length > 0) {
      console.log(`Pre-initializing Essentia WASM (${binary.length} bytes) for Cloudflare Workers...`);
      
      // Build info object for WASM imports
      const asmLibraryArg = EssentiaWASMRaw.asmLibraryArg || {};
      const info = { a: asmLibraryArg };
      
      // Use WebAssembly.instantiate() which is supported in Cloudflare Workers
      const result = await WebAssembly.instantiate(binary, info);
      
      // Get the Module object (EssentiaWASMRaw IS the Module)
      const Module = EssentiaWASMRaw.Module || EssentiaWASMRaw;
      
      // Store the instance and module so instantiateSync can use them
      // Set on EssentiaWASMRaw
      EssentiaWASMRaw['_wasmInstance'] = result.instance;
      EssentiaWASMRaw['_wasmModule'] = result.module;
      EssentiaWASMRaw['asm'] = result.instance.exports;
      
      // Also set on Module if it exists
      if (Module && Module !== EssentiaWASMRaw) {
        Module['_wasmInstance'] = result.instance;
        Module['_wasmModule'] = result.module;
        Module['asm'] = result.instance.exports;
      }
      
      // CRITICAL: Set on globalThis.Module BEFORE module executes
      // This ensures the module can find pre-initialized WASM when it loads
      if (typeof globalThis !== 'undefined') {
        // Create or get global Module object
        if (!globalThis.Module) {
          globalThis.Module = {};
        }
        // Set pre-initialized WASM properties
        globalThis.Module['_wasmInstance'] = result.instance;
        globalThis.Module['_wasmModule'] = result.module;
        globalThis.Module['asm'] = result.instance.exports;
        
        // Also set on EssentiaWASMRaw.Module if it exists
        if (EssentiaWASMRaw.Module) {
          EssentiaWASMRaw.Module['_wasmInstance'] = result.instance;
          EssentiaWASMRaw.Module['_wasmModule'] = result.module;
          EssentiaWASMRaw.Module['asm'] = result.instance.exports;
        }
      }
      
      console.log('✓ Essentia WASM pre-initialized successfully');
      EssentiaWASM = EssentiaWASMRaw;
    } else {
      console.log('⚠ WASM binary not available - module may initialize on first use');
      EssentiaWASM = EssentiaWASMRaw;
    }
    }
  } catch (error) {
    console.error('Error pre-initializing Essentia WASM:', error.message);
    console.error(error.stack);
    // Fall back to raw module
    EssentiaWASM = EssentiaWASMRaw;
  }
  
  return { Essentia, EssentiaWASM };
})();

// Export the promise - consumers should await it
export const EssentiaReady = initPromise;

// Export the values directly (will be undefined until promise resolves)
// For compatibility, but consumers should use EssentiaReady
export { Essentia, EssentiaWASM };
