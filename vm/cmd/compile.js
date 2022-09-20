#!/bin/env node
import path from 'path';
import asc from "assemblyscript/asc";
import { fileURLToPath } from 'url';

const __dir = fileURLToPath(import.meta.url)

export async function compile (aPath) {
  const [_, filePath] = aPath.split('/compiled/')
  const { error, stderr } = await asc.main([
    path.join(__dir, '../../assembly/compiled', filePath),
    "--outFile", path.join(__dir, '../../build', filePath.replace('.ts', '.wasm')),
    "--textFile", path.join(__dir, '../../build', filePath.replace('.ts', '.wat')),
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


