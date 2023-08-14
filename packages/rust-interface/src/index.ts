import {BCS, BufWriter} from "@aldea/core";
import {compile} from "@aldea/compiler";
import { readFileSync, writeFileSync } from 'fs';

export async function main(): Promise<void> {
  const inputFileName = process.argv[2]
  const outputFileName = process.argv[3]
  if (!inputFileName) {
    console.log('no filename provided')
    process.exit(1)
  }

  const buf = readFileSync(inputFileName)

  const [entries, files] = BCS.pkg.decode(Buffer.from(buf))

  const result = await compile(entries, files, new Map())

  let writer = new BufWriter()

  writer.writeULEB(result.output.wasm.byteLength)
  writer.writeBytes(result.output.wasm)
  writer.writeULEB(result.output.abi.byteLength)
  writer.writeBytes(result.output.abi)

  writeFileSync(outputFileName, writer.toBytes())
}

main().catch(() => process.exit(1))
