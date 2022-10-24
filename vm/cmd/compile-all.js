import glob from 'glob';
import { fileURLToPath } from "url"
import { compileFile } from "./compile-file.js"
const __dirname = fileURLToPath(new URL('.', import.meta.url));


glob(`${__dirname}../assembly/aldea/**/*.ts`, {}, async (err, fileList) => {
  for (const file of fileList) {
    compileFile(file).catch(console.error)
  }
})
