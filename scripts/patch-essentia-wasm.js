/**
 * Additional patch for Essentia.js WASM instantiation
 * 
 * Replaces synchronous WASM instantiation with async to comply with
 * Cloudflare Workers restrictions.
 * 
 * Strategy:
 * 1. Patch createWasm to check for pre-initialized WASM first
 * 2. If pre-initialized, use it directly via receiveInstance
 * 3. Modify instantiateSync to return pre-initialized WASM or throw
 * 4. Replace synchronous WebAssembly.Module/Instance calls with null (they're not used)
 */

const fs = require('fs');
const path = require('path');

const essentiaWasmPath = path.join(__dirname, '../node_modules/essentia.js/dist/essentia-wasm.es.js');

console.log('Patching Essentia.js WASM instantiation for Cloudflare Workers...');

try {
  let content = fs.readFileSync(essentiaWasmPath, 'utf8');
  let patched = false;
  
  // Patch 1: Replace WebAssembly.Module() call (set to null, won't be used)
  const moduleCall = 'module=new WebAssembly.Module(binary)';
  if (content.includes(moduleCall)) {
    content = content.replace(moduleCall, 'module=null/* CF_WORKERS: WebAssembly.Module() not allowed */');
    patched = true;
    console.log('✓ Replaced WebAssembly.Module() call');
  }
  
  // Patch 2: Replace WebAssembly.Instance() call (set to null, won't be used)
  const instanceCall = 'instance=new WebAssembly.Instance(module,info)';
  if (content.includes(instanceCall)) {
    content = content.replace(instanceCall, 'instance=null/* CF_WORKERS: WebAssembly.Instance() not allowed */');
    patched = true;
    console.log('✓ Replaced WebAssembly.Instance() call');
  }
  
  // Patch 3: Modify createWasm to check for pre-initialized WASM BEFORE calling instantiateSync
  // Pattern: }if(Module["instantiateWasm"]){try{var exports=Module["instantiateWasm"](info,receiveInstance);return exports}catch(e){err(...);return false}}instantiateSync();return Module["asm"]
  // We need to insert a check right before instantiateSync() is called
  const createWasmBeforeCallPattern = /(\}if\(Module\["instantiateWasm"\]\)\{try\{var exports=Module\["instantiateWasm"\]\(info,receiveInstance\);return exports\}catch\(e\)\{err\("Module\.instantiateWasm callback failed with error: "\+e\);return false\}\})(instantiateSync\(\);return Module\["asm"\])/;
  
  if (createWasmBeforeCallPattern.test(content)) {
    content = content.replace(createWasmBeforeCallPattern, (match, before, after) => {
      // Insert check for pre-initialized WASM before calling instantiateSync
      return before + `
      // Cloudflare Workers: Check for pre-initialized WASM first
      if (Module["_wasmInstance"] && Module["_wasmModule"]) {
        receiveInstance(Module["_wasmInstance"], Module["_wasmModule"]);
        return Module["asm"];
      }
      ` + after;
    });
    patched = true;
    console.log('✓ Modified createWasm to check for pre-initialized WASM');
  }
  
  // Patch 4: Modify instantiateSync to return pre-initialized WASM or return null (will be handled by createWasm)
  // Find the instantiateSync function definition - it should be a simple function
  // Pattern: function instantiateSync(){...}
  const instantiateSyncPattern = /function instantiateSync\(\)\{([^}]*)\}/;
  const instantiateSyncMatch = content.match(instantiateSyncPattern);
  
  if (instantiateSyncMatch && !content.includes('CF_WORKERS_PRE_INIT_CHECK')) {
    const funcBody = instantiateSyncMatch[1];
    
    // Check if it already has the pre-init check
    if (!funcBody.includes('_wasmInstance')) {
      // Replace the entire function to check for pre-initialized WASM first
      const newInstantiateSync = `function instantiateSync(){
    // CF_WORKERS_PRE_INIT_CHECK: Cloudflare Workers compatibility - check for pre-initialized WASM
    if (Module["_wasmInstance"] && Module["_wasmModule"]) {
      // WASM already initialized, return the instance
      return Module["_wasmInstance"];
    }
    // WASM not pre-initialized yet - return null (createWasm will handle this)
    // The loader will pre-initialize WASM before this module is used
    return null;
    ${funcBody}
}`;
      
      content = content.replace(instantiateSyncPattern, newInstantiateSync);
      patched = true;
      console.log('✓ Modified instantiateSync to check for pre-initialized WASM');
    }
  }
  
  // Patch 5: Modify createWasm to return a proxy that waits for WASM initialization
  // This allows the module to execute top-level code even if WASM isn't ready yet
  const createWasmReturnPattern = /(return Module\["asm"\])/;
  if (createWasmReturnPattern.test(content) && !content.includes('CF_WORKERS_PROXY')) {
    content = content.replace(createWasmReturnPattern, (match) => {
      return `
      // CF_WORKERS_PROXY: Return a proxy that waits for WASM initialization
      var wasmExports = Module["asm"];
      if (!wasmExports && Module["_wasmInstance"] && Module["_wasmModule"]) {
        // WASM was pre-initialized but Module["asm"] wasn't set - set it now
        receiveInstance(Module["_wasmInstance"], Module["_wasmModule"]);
        wasmExports = Module["asm"];
      }
      if (wasmExports) {
        return wasmExports;
      }
      // WASM not ready yet - return a proxy that waits for it
      return new Proxy({}, {
        get: function(target, prop) {
          // Wait for WASM to be ready (polling)
          var maxWait = 1000; // 1 second max wait
          var waited = 0;
          while (!Module["asm"] && waited < maxWait) {
            // Check if WASM was pre-initialized
            if (Module["_wasmInstance"] && Module["_wasmModule"]) {
              receiveInstance(Module["_wasmInstance"], Module["_wasmModule"]);
              break;
            }
            // Small delay (synchronous wait - not ideal but necessary)
            var start = Date.now();
            while (Date.now() - start < 1) {}
            waited++;
          }
          if (!Module["asm"]) {
            throw new Error("CF_WORKERS_ASYNC_WASM_REQUIRED: WASM not initialized after waiting. Ensure essentia-loader.js completes before using Essentia.");
          }
          return Module["asm"][prop];
        }
      });`;
    });
    patched = true;
    console.log('✓ Modified createWasm to return a proxy that waits for WASM');
  }
  
  if (patched) {
    fs.writeFileSync(essentiaWasmPath, content, 'utf8');
    console.log('✓ WASM instantiation patched successfully');
  } else {
    console.log('✓ No WASM instantiation patches needed (may already be patched)');
  }
} catch (error) {
  console.error('✗ Error patching WASM instantiation:', error.message);
  console.error(error.stack);
  process.exit(1);
}
