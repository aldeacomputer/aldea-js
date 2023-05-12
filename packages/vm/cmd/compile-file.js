import { compile } from '@aldea/compiler'
import fs from 'fs'
import { abiFromBin, abiToJson } from "@aldea/core"

export async function compileFile (file, outDir) {
  const fileName = file.replace(/^\/.*\//, '')
  const fileBuf = fs.readFileSync(file)
  try {
    const result = await compile(fileBuf.toString())
    fs.mkdirSync(outDir, {recursive: true})
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.wasm')}`, result.output.wasm)
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.wat')}`, result.output.wat)
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.docs.json')}`, result.output.docs)
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.abi.bin')}`, result.output.abi)
    fs.writeFileSync(`${outDir}/${fileName.replace('.ts', '.abi.json')}`, abiToJson(abiFromBin(result.output.abi)))
    console.log(`compiled ${fileName} ok.`)
    if (process.env.VERBOSE === 'true') {
      console.log(result.stdout.toString())
    }
  } catch (e) {
    console.warn(`error compiling ${file}: ${e.message}`)
    console.error(e.stderr.toString())
  }
}
