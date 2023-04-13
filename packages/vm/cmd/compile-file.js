import { fileURLToPath } from "url"
import { compile } from '@aldea/compiler'
import fs from 'fs'
import { abiFromCbor, abiToJson } from "@aldea/compiler/abi"
import path from 'path'

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export async function compileFile (file, outDir) {
  const fileName = file.replace(/^\/.*\//, '')
  const fileBuf = fs.readFileSync(file)
  try {
    const result = await compile(fileBuf.toString())
    fs.mkdirSync(outDir, {recursive: true})
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.wasm')}`, result.output.wasm)
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.wat')}`, result.output.wat)
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.docs.json')}`, result.output.docs)
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.abi.cbor')}`, result.output.abi)
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.abi.json')}`, abiToJson(abiFromCbor(result.output.abi.buffer)))
    console.log(`compiled ${fileName} ok.`)
    if (process.env.VERBOSE === 'true') {
      console.log(result.stdout.toString())
    }
  } catch (e) {
    console.warn(`error compiling ${file}: ${e.message}`)
    console.error(e.stderr.toString())
  }
}
