import { compile } from '@aldea/compiler'
import fs from 'fs'

function bufferToExportedUint8ArrayExpession (buff) {
  return `export const data = new Uint8Array([${Array.from(buff).join(',')}])`
}

function buffAsExportedString(buff) {
  return `export const data = \`${buff.toString().replace('`', '\`')}\``
}

export async function compileFileToTs (file, outDir) {
  const fileName = file.replace(/^\/.*\//, '')
  const fileBuf = fs.readFileSync(file)
  try {
    // create dir
    const result = await compile(fileBuf.toString())
    fs.mkdirSync(outDir, {recursive: true})

    // save wasm
    const wasmStr = bufferToExportedUint8ArrayExpession(result.output.wasm)
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.wasm.ts')}`, wasmStr)

    // save docs
    const docsStr = bufferToExportedUint8ArrayExpession(Buffer.from(result.output.docs))
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.docs.json.ts')}`, docsStr)

    // save abi as binary
    const binAbiStr = bufferToExportedUint8ArrayExpession(result.output.abi)
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.abi.bin.ts')}`, binAbiStr)

    // save source
    const sourceStr = buffAsExportedString(fs.readFileSync(file))
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.source.ts')}`, sourceStr)

    // finish
    console.log(`compiled ${fileName} ok.`)
    if (process.env.VERBOSE === 'true') {
      console.log(result.stdout.toString())
    }
  } catch (e) {
    console.warn(`error compiling ${file}: ${e.message}`)
    console.error(e.stderr.toString())
  }
}
