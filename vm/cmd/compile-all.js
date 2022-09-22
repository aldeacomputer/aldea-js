import { compileFile } from "./compile-file.js"
import glob from 'glob';
import { fileURLToPath } from "url"
import { exec } from "child_process";

const __dirname = fileURLToPath(new URL('.', import.meta.url));

glob(`${__dirname}../assembly/manual/**/*.ts`, {}, async (err, fileList) => {
  for (const file of fileList) {
    console.log(file)
    try {
      const relativePath = file.replace(/.*\/manual\//, '')
      await compileFile(relativePath)
    } catch (e) {
      console.error(e.message)
    }
  }
})


function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) return reject(error)
      if (stderr) return reject(stderr)
      resolve(stdout)
    })
  })
}


glob(`${__dirname}../assembly/aldea/**/*.ts`, {}, async (err, fileList) => {
  for (const file of fileList) {
    const relativePath = file.replace(/.*\/aldea\//, '')
    const stdout = await run(`yarn aldea compile ${file} -o ${__dirname}../build/aldea/${relativePath.replace('.ts', '.wasm')}`)
    console.log(stdout.toString())
  }
})
