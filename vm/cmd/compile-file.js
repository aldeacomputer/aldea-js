#!/bin/env node
import { exec } from "child_process"
import { fileURLToPath } from "url"

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) return reject(error)
      if (stderr) return reject(stderr)
      resolve(stdout)
    })
  })
}

export async function compileFile (file) {
  const relativePath = file.replace(/.*\/aldea\//, '')
  const stdout = await run(`yarn aldea compile ${file} -o ${__dirname}../build/aldea/${relativePath.replace('.ts', '.wasm')}`).catch(console.error)
  console.log(stdout)
}
