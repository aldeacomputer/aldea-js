import {CBOR, Sequence} from "cbor-redux";

export function encodeSequence (args: any[]): Uint8Array {
  const seq = Sequence.from(args)
  return new Uint8Array(CBOR.encode(seq))
}

export function decodeSequence (data: Uint8Array): any[] {
  if (data.length === 0) { return [] }
  return CBOR.decode(data.buffer, null, {mode: "sequence", dictionary: 'map'}).data
}

