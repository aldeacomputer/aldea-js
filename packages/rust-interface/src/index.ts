import { BCS, BufWriter } from '@aldea/core'
import { compile } from '@aldea/compiler'
import { readFileSync, writeFileSync } from 'node:fs'

export async function main (): Promise<void> {
  const inputFileName = process.argv[2]
  const outputFileName = process.argv[3]

  if (inputFileName.length === 0) {
    console.log('no filename provided')
    process.exit(1)
  }

  const buf = readFileSync(inputFileName)

  const [entries, files] = BCS.pkg.decode(Buffer.from(buf))

  const result = await compile(entries, files, new Map())

  const writer = new BufWriter()

  writer.writeULEB(result.output.wasm.byteLength)
  writer.writeBytes(result.output.wasm)
  writer.writeULEB(result.output.abi.byteLength)
  writer.writeBytes(result.output.abi)

  writeFileSync(outputFileName, writer.toBytes())
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
