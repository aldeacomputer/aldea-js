import { glob } from 'glob';
import { fileURLToPath } from "url"
import { compileFile } from "./compile-file.js"
import { compileFileToTs } from './compile-file-to-ts.js'
const __dirname = fileURLToPath(new URL('.', import.meta.url));


await glob(`${__dirname}../assembly/aldea/**/*.ts`).then(async (fileList) => {
  for (const file of fileList) {
    await compileFile(file, `${__dirname}/../build/aldea`).catch(console.error)
  }
})

await glob(`${__dirname}../assembly/builtins/*.ts`).then(async (fileList) => {
  for (const file of fileList) {
    await compileFileToTs(file, `${__dirname}/../src/builtins`).catch(console.error)
  }
})
