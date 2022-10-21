#!/bin/env node
import chokidar from 'chokidar'
import { fileURLToPath } from "url"
import { path } from "assemblyscript/util/node.js"
import { compileFile } from "./compile-file.js"
const __dir = fileURLToPath(import.meta.url)

// let promise = Promise.resolve()
const current = new Set()

chokidar.watch(path.join(__dir, '../../assembly/aldea')).on('all', async (event, path) => {
  if (['change', 'add'].includes(event) && !current.has(path)) {
    current.add(path)
    console.log(`detected changes on ${path}. Compiling...`)
    await compileFile(path).finally(() => current.delete(path))
  }
});
