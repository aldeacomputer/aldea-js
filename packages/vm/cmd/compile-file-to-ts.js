import { fileURLToPath } from "url"
import { compile } from '@aldea/compiler'
import fs from 'fs'
import { abiFromCbor, abiToJson } from "@aldea/compiler/abi"
import path from 'path'

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function bufferToExportedUint8ArrayExpession (buff) {
  return `export const data = new Uint8Array([${Array.from(buff).join(',')}])`
}

function jsonToJsonExpression(buff) {
  return `export const rawJson = ${Buffer.from(buff).toString()}`
}

function buffAsExportedString(buff) {
  return `export const data = \`${buff.toString().replace('`', '\`')}\``
}

export async function compileFileToTs (file, outDir) {
  const fileName = file.replace(/^\/.*\//, '')
  const fileBuf = fs.readFileSync(file)
  try {
    const result = await compile(fileBuf.toString())
    fs.mkdirSync(outDir, {recursive: true})
    const wasmStr = bufferToExportedUint8ArrayExpession(result.output.wasm)
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.wasm.ts')}`, wasmStr)
    const docsStr = bufferToExportedUint8ArrayExpession(Buffer.from(result.output.docs))
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.docs.json.ts')}`, docsStr)
    const cborAbiStr = buffAsExportedString(result.output.abi)
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.abi.json.ts')}`, cborAbiStr)
    const sourceStr = buffAsExportedString(fs.readFileSync(file))
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.source.ts')}`, sourceStr)
    console.log(`compiled ${fileName} ok.`)
    if (process.env.VERBOSE === 'true') {
      console.log(result.stdout.toString())
    }
  } catch (e) {
    console.warn(`error compiling ${file}: ${e.message}`)
    console.error(e.stderr.toString())
  }
}
