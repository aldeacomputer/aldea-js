import { fileURLToPath } from "url"
import { compile } from '@aldea/compiler'
import fs from 'fs'
import { abiFromCbor, abiToJson } from "@aldea/compiler/abi"
import path from 'path'

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export async function compileFile (file) {
  const relativePath = file.replace(/.*\/aldea\//, '')
  const fileBuf = fs.readFileSync(file)
  try {
    const result = await compile(fileBuf.toString())
    const dirName = path.dirname(`${__dirname}../build/aldea/${relativePath}`)
    fs.mkdirSync(dirName, {recursive: true})
    fs.writeFileSync(`${__dirname}../build/aldea/${relativePath.replace('.ts', '.wasm')}`, result.output.wasm)
    fs.writeFileSync(`${__dirname}../build/aldea/${relativePath.replace('.ts', '.wat')}`, result.output.wat)
    fs.writeFileSync(`${__dirname}../build/aldea/${relativePath.replace('.ts', '.docs.json')}`, result.output['docs.json'])
    fs.writeFileSync(`${__dirname}../build/aldea/${relativePath.replace('.ts', '.abi.cbor')}`, result.output.abi)
    fs.writeFileSync(`${__dirname}../build/aldea/${relativePath.replace('.ts', '.abi.json')}`, abiToJson(abiFromCbor(result.output.abi.buffer)))
    console.log(`compiled ${relativePath} ok.`)
    if (process.env.VERBOSE === 'true') {
      console.log(result.stdout.toString())
    }
  } catch (e) {
    console.warn(`error compiling ${relativePath}: ${e.message}`)
    console.error(e.stderr.toString())
  }
}
