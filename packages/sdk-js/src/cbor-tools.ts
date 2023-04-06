import {CBOR, Sequence, TaggedValue} from "cbor-redux";

/**
 * InstructionRef class - just a wrapper around number
 */
export class InstructionRef {
  idx: number;

  constructor(idx: number) {
    if (!Number.isInteger(idx)) throw new Error('invalid ref. must be an integer.')
    this.idx = idx
  }
}

export const REF_CBOR_TAG = 42

export function refUntagger(_key: any, val: any): any {
  if (val instanceof TaggedValue && val.tag === REF_CBOR_TAG) {
    return new InstructionRef(val.value)
  } else {
    return val
  }
}

export function refTagger(_key: any, val: any): any {
  if (val instanceof InstructionRef) {
    return new TaggedValue(val.idx, REF_CBOR_TAG)
  } else if (val instanceof Sequence) {
    return new Sequence(val.data.map((val, i) => refTagger(i, val)))
  } else {
    return val
  }
}


export function parseCbor (buf: Uint8Array): any[] {
  if (buf.byteLength === 0) {
    return []
  }

  return CBOR.decode(new Uint8Array(buf).buffer, refUntagger, { mode: 'sequence' }).data
}


export function serializeCbor (args: any[]): Uint8Array {
  return new Uint8Array(CBOR.encode(new Sequence(args), refTagger))
}
/**
 * Wrap a number with InstructionRef
 */
export function ref(idx: number): InstructionRef {
  return new InstructionRef(idx)
}
