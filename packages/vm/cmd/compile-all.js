import glob from 'glob';
import { fileURLToPath } from "url"
import { compileFile } from "./compile-file.js"
import { compileFileToTs } from './compile-file-to-ts.js'
const __dirname = fileURLToPath(new URL('.', import.meta.url));


glob(`${__dirname}../assembly/aldea/**/*.ts`, {}, async (err, fileList) => {
  for (const file of fileList) {
    await compileFile(file, `${__dirname}/../build/aldea`).catch(console.error)
  }
})

glob(`${__dirname}../assembly/builtins/*.ts`, {}, async (err, fileList) => {
  for (const file of fileList) {
    await compileFileToTs(file, `${__dirname}/../src/builtins`).catch(console.error)
  }
})
