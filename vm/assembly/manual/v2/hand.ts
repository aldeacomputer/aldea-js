import {CborReader} from "../cbor_reader";
import {CborWriter} from "../cbor-writer";

// // @ts-ignore
// @external("$aldea", "newInstance")
// declare function newInstance(args: Uint8Array): Uint8Array;

class Weapon {
  power: u32;

  constructor() {
    this.power = 0;
  }
}

class Hand extends Weapon {
  constructor() {
    super();
    this.power = 1;
  }
}


export function Hand_constructor (_argBuf: Uint8Array): Uint8Array {
  const instance = new Hand();

  const ret = new CborWriter();
  ret.encodeRef<Hand>(instance);
  return ret.toBuffer();
}

export function Hand_parse(argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf)
  const power = args.decodeInt();
  const ptr = __new(offsetof<Hand>(), idof<Hand>());
  store<u32>(ptr + offsetof<Hand>('power'), power);

  const ret = new CborWriter();
  ret.encodeRef<u32>(ptr as u32);
  return ret.toBuffer();
}

export function Hand$serialize(argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const instance = args.decodeRef<Hand>();

  const ret = new CborWriter();
  ret.encodeInt(instance.power);
  return ret.toBuffer();
}
