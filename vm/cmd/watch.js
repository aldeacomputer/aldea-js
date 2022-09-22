#!/bin/env node
import chokidar from 'chokidar'
import { fileURLToPath } from "url"
import { path } from "assemblyscript/util/node.js"
import { compileFile } from "./compile-file.js"
const __dir = fileURLToPath(import.meta.url)

chokidar.watch(path.join(__dir, '../../assembly/manual')).on('all', async (event, path) => {
  if (event === 'change') {
    const subpath = path.split('/manual/')[1]
    await compileFile(subpath)
  }
});
