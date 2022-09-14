import {CborReader} from "../cbor_reader";
import {CborWriter} from "../cbor-writer";

// @ts-ignore
@external("$aldea", "newInstance")
declare function newInstance(args: Uint8Array): Uint8Array;

class Weapon {
  origin: string;

  constructor(origin: string) {
    this.origin = origin
  }
}

class HandProxy extends Weapon{
  constructor(origin: string) {
    super(origin);
  }

  static $$create (): HandProxy {
    const writer = new CborWriter();
    writer.encodeStr('v2/hand.wasm');
    writer.encodeBuf(
      new Uint8Array(0)
    );
    const responseBuf = newInstance(writer.toBuffer());
    const origin = new CborReader(responseBuf).decodeStr();
    return new HandProxy(origin);
  }
}


class Fighter {
  health: u8;
  leftArm: Weapon;

  constructor() {
    this.health = 100;
    this.leftArm = HandProxy.$$create();
  }

  equipLeftHand (gear: Weapon): void {
    this.leftArm = gear;
  }
}

export function $_constructor (_argBuf: Uint8Array): Uint8Array {
  const instance = new Fighter();

  const ret = new CborWriter();
  ret.encodeRef<Fighter>(instance);
  return ret.toBuffer();
}

export function $_parse(argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const health = args.decodeInt() as u32;
  const leftArmOrigin = args.decodeStr();

  new HandProxy(leftArmOrigin);

  const ptr = __new(offsetof<Fighter>(), idof<Fighter>());
  store<u32>(ptr + offsetof<Fighter>('health'), health);
  store<u32>(ptr + offsetof<Fighter>('leftArm'), health);

  const ret = new CborWriter();
  ret.encodeRef<u32>(ptr as u32);
  return ret.toBuffer();
}

export function $$serialize(argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const instance = args.decodeRef<Fighter>();

  const ret = new CborWriter();
  ret.encodeInt(instance.health);
  ret.encodeStr(instance.leftArm.origin);
  return ret.toBuffer();
}
