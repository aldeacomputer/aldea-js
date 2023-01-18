import {CBOR} from "cbor-redux";
import {refUntagger} from "../instruction.js";

export function decodeCbor (buf: ArrayBuffer): any[] {
  if (buf.byteLength === 0) {
    return []
  }
  return CBOR.decode(buf, refUntagger, { mode: 'sequence' }).data
}
