#!/bin/env node
import path from 'path';
import asc from "assemblyscript/asc";
import { fileURLToPath } from 'url';

const __dir = fileURLToPath(import.meta.url)

for (const moduleName of ['sword', 'fighter']) {
    const { error, stdout, stderr, stats } = await asc.main([
        path.join(__dir, '../../assembly/compiled', `${moduleName}.ts`),
        "--outFile", path.join(__dir, '../../build', `${moduleName}.wasm`),
        "--textFile", path.join(__dir, '../../build', `${moduleName}.wat`),
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
        console.log(stdout.toString());
    }
}


const modulePath = path.join(__dir, '../../build', 'sword.debug.wasm')

console.log(modulePath)