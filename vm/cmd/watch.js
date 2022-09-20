#!/bin/env node
import chokidar from 'chokidar'
import { fileURLToPath } from "url"
import { path } from "assemblyscript/util/node.js"
import { compile } from "./compile.js"
const __dir = fileURLToPath(import.meta.url)

chokidar.watch(path.join(__dir, '../../assembly/compiled')).on('all', async (event, path) => {
  if (event === 'change') {
    console.log('compiling...')
    await compile(path)
  }
});
