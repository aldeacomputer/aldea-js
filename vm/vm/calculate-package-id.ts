import {CBOR, Sequence} from "cbor-redux";
import {BufWriter} from "@aldea/sdk-js/buf-writer";
import {blake3} from "@aldea/sdk-js/support/hash";

export function calculatePackageId (entryPoints: string[], sources: Map<string, string>): Uint8Array {
  const buf = new BufWriter()
  const cborData = CBOR.encode(new Sequence([entryPoints.sort(), sources]))
  buf.writeBytes(new Uint8Array(cborData))
  return blake3(buf.data)
}
