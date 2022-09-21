import {CborReader} from "../cbor_reader";
import {CborWriter} from "../cbor-writer";

// // @ts-ignore
// @external("$aldea", "newInstance")
// declare function newInstance(args: Uint8Array): Uint8Array;

abstract class Weapon {
  power: u32;

  constructor() {
    this.power = 0;
  }

  abstract use(): void;
}

class Sword extends Weapon {
  constructor() {
    super();
    this.power = 1;
  }

  use (): void {
    this.power++;
  }
}

export function $_constructor (_argBuf: Uint8Array): Uint8Array {
  const instance = new Sword();

  const ret = new CborWriter();
  ret.encodeRef<Sword>(instance);
  return ret.toBuffer();
}

export function $_parse(argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const power = args.decodeInt() as u32;

  const ptr = __new(offsetof<Sword>(), idof<Sword>());
  store<u32>(ptr + offsetof<Sword>('power'), power);

  const ret = new CborWriter();
  ret.encodeRef<u32>(ptr as u32);
  return ret.toBuffer();
}

export function $$serialize(argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf)
  const instance = args.decodeRef<Sword>()

  const ret = new CborWriter();
  ret.encodeInt(instance.power);
  return ret.toBuffer();
}

export function $$use (argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const instance = args.decodeRef<Sword>();

  instance.use();

  return new Uint8Array(0);
}
