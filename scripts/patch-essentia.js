/**
 * Build-time patch script for Essentia.js
 * 
 * Replaces `new Function()` calls with static alternatives to make it
 * compatible with Cloudflare Workers which disallows dynamic code generation.
 */

const fs = require('fs');
const path = require('path');

const essentiaWasmPath = path.join(__dirname, '../node_modules/essentia.js/dist/essentia-wasm.es.js');

console.log('Patching Essentia.js WASM module for Cloudflare Workers compatibility...');

try {
  let content = fs.readFileSync(essentiaWasmPath, 'utf8');
  let patched = false;
  
  // Pattern 1: Replace createNamedFunction's new Function call
  const exactPattern1 = 'return new Function("body","return function "+name+"() {\\n"+\'    "use strict";\'+"    return body.apply(this, arguments);\\n"+"};\\n")(body)';
  const replacement1 = 'return function() {"use strict";return body.apply(this, arguments);}';
  
  if (content.includes(exactPattern1)) {
    content = content.replace(exactPattern1, replacement1);
    patched = true;
    console.log('✓ Patched createNamedFunction');
  }
  
  // Pattern 2: Replace makeDynCaller's new Function call
  // Pattern: return new Function("dynCall","rawFunction",body)(dynCall,rawFunction)
  const dynCallerPattern = 'return new Function("dynCall","rawFunction",body)(dynCall,rawFunction)';
  if (content.includes(dynCallerPattern)) {
    // Replace with a static wrapper that calls dynCall with rawFunction
    const dynCallerReplacement = 'return function() {return dynCall.apply(this,arguments);}';
    content = content.replace(dynCallerPattern, dynCallerReplacement);
    patched = true;
    console.log('✓ Patched makeDynCaller');
  }
  
  // Pattern 3: Replace craftEmvalAllocator's new Function call
  // Pattern: return new Function("requireRegisteredType","Module","__emval_register",functionBody)(requireRegisteredType,Module,__emval_register)
  const emvalPattern = 'return new Function("requireRegisteredType","Module","__emval_register",functionBody)(requireRegisteredType,Module,__emval_register)';
  if (content.includes(emvalPattern)) {
    // Find the craftEmvalAllocator function and replace it entirely
    const craftEmvalStart = content.indexOf('function craftEmvalAllocator');
    if (craftEmvalStart > -1) {
      // Find the end of the function (next } that closes it)
      let braceCount = 0;
      let inFunction = false;
      let functionEnd = craftEmvalStart;
      
      for (let i = craftEmvalStart; i < content.length; i++) {
        if (content[i] === '{') {
          braceCount++;
          inFunction = true;
        } else if (content[i] === '}') {
          braceCount--;
          if (inFunction && braceCount === 0) {
            functionEnd = i + 1;
            break;
          }
        }
      }
      
      const beforeFunction = content.substring(0, craftEmvalStart);
      const afterFunction = content.substring(functionEnd);
      
      const replacement = `function craftEmvalAllocator(argCount){
    // Patched for Cloudflare Workers - static allocators only
    const staticAllocators = {
      0: function(requireRegisteredType, Module, __emval_register) {
        return function(constructor, argTypes, args) {
          return __emval_register(new constructor());
        };
      },
      1: function(requireRegisteredType, Module, __emval_register) {
        return function(constructor, argTypes, args) {
          var argType0 = requireRegisteredType(Module['HEAP32'][(argTypes >>> 2) + 0], "parameter 0");
          var arg0 = argType0.readValueFromPointer(args);
          args += argType0['argPackAdvance'];
          return __emval_register(new constructor(arg0));
        };
      },
      2: function(requireRegisteredType, Module, __emval_register) {
        return function(constructor, argTypes, args) {
          var argType0 = requireRegisteredType(Module['HEAP32'][(argTypes >>> 2) + 0], "parameter 0");
          var arg0 = argType0.readValueFromPointer(args);
          args += argType0['argPackAdvance'];
          var argType1 = requireRegisteredType(Module['HEAP32'][(argTypes >>> 2) + 1], "parameter 1");
          var arg1 = argType1.readValueFromPointer(args);
          args += argType1['argPackAdvance'];
          return __emval_register(new constructor(arg0, arg1));
        };
      },
      3: function(requireRegisteredType, Module, __emval_register) {
        return function(constructor, argTypes, args) {
          var argType0 = requireRegisteredType(Module['HEAP32'][(argTypes >>> 2) + 0], "parameter 0");
          var arg0 = argType0.readValueFromPointer(args);
          args += argType0['argPackAdvance'];
          var argType1 = requireRegisteredType(Module['HEAP32'][(argTypes >>> 2) + 1], "parameter 1");
          var arg1 = argType1.readValueFromPointer(args);
          args += argType1['argPackAdvance'];
          var argType2 = requireRegisteredType(Module['HEAP32'][(argTypes >>> 2) + 2], "parameter 2");
          var arg2 = argType2.readValueFromPointer(args);
          args += argType2['argPackAdvance'];
          return __emval_register(new constructor(arg0, arg1, arg2));
        };
      }
    };
    
    if (staticAllocators[argCount]) {
      return staticAllocators[argCount];
    }
    
    // Fallback for unsupported arg counts
    return function(requireRegisteredType, Module, __emval_register) {
      return function(constructor, argTypes, args) {
        throw new Error('Unsupported argument count: ' + argCount + ' (Cloudflare Workers limitation)');
      };
    };
  }`;
      
      content = beforeFunction + replacement + afterFunction;
      patched = true;
      console.log('✓ Patched craftEmvalAllocator');
    }
  }
  
  // Check for any remaining new Function calls
  const remaining = content.match(/new\s+Function\s*\(/g);
  if (remaining && remaining.length > 0) {
    console.log(`⚠ Warning: Found ${remaining.length} remaining new Function() calls`);
    console.log('  These may cause issues in Cloudflare Workers');
  } else {
    console.log('✓ All new Function() calls have been patched');
  }
  
  if (patched) {
    fs.writeFileSync(essentiaWasmPath, content, 'utf8');
    console.log('✓ Essentia.js WASM module patched successfully');
  } else {
    console.log('✓ No patches applied - file may already be patched');
  }
  
  // Run additional WASM instantiation patch
  require('./patch-essentia-wasm.js');
} catch (error) {
  console.error('✗ Error patching Essentia.js:', error.message);
  console.error(error.stack);
  process.exit(1);
}
