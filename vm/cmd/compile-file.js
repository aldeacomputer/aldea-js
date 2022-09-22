#!/bin/env node
import path from 'path';
import asc from "assemblyscript/asc";
import { fileURLToPath } from 'url';

const __dir = fileURLToPath(import.meta.url)

export async function compileFile (aPath) {
  const { error, stderr } = await asc.main([
    path.join(__dir, '../../assembly/manual', aPath),
    "--outFile", path.join(__dir, '../../build/manual', aPath.replace('.ts', '.wasm')),
    "--textFile", path.join(__dir, '../../build/manual', aPath.replace('.ts', '.wat')),
    "--debug",
    "--sourceMap",
    "--runtime", "stub",
    "--importMemory",
    "--exportRuntime"
  ], {
    "bindings": "esm",
    "importMemory": true,
    "initialMemory": 1,
    "maximumMemory": 1,
    "runtime": "stub"
  })

  if (error) {
    console.log("Compilation failed: " + error.message);
    console.log(stderr.toString());
  } else {
    console.log('ok')
  }
}

if (process.argv[2]) {
  compileFile(process.argv[2])
}
