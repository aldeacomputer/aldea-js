import {CborReader} from "../cbor_reader";
import {CborWriter} from "../cbor-writer";

// @ts-ignore
@external("$aldea", "newInstance")
declare function aldeaCreate(args: Uint8Array): Uint8Array;

function createInstance (moduleName:string, argBuf: Uint8Array): string {
  const writer = new CborWriter();
  writer.encodeStr(moduleName);
  writer.encodeBuf(argBuf);
  const responseBuf = aldeaCreate(writer.toBuffer());
  return new CborReader(responseBuf).decodeStr();
}

// @ts-ignore
@external("$aldea", "adoptJig")
declare function adoptJig(buffPointer: Uint8Array): Uint8Array;

function adopt(childOrigin: string): void {
  const cbor = new CborWriter();
  cbor.encodeStr(childOrigin);
  adoptJig(cbor.toBuffer());
}

class WeaponProxy {
  origin: string;

  constructor(origin: string) {
    this.origin = origin
  }
}

class HandProxy extends WeaponProxy{
  constructor(origin: string) {
    super(origin);
  }

  static $$create(): HandProxy {
    const origin = createInstance('v2/hand.wasm', new Uint8Array(0));
    return new HandProxy(origin);
  }
}


class Fighter {
  health: u8;
  leftArm: WeaponProxy;
  stash: Array<WeaponProxy>;

  constructor() {
    this.health = 100;
    this.leftArm = HandProxy.$$create();
    this.stash = [];
    adopt(this.leftArm.origin);
  }

  equipLeftHand (gear: WeaponProxy): void {
    adopt(gear.origin);
    this.stash.push(this.leftArm);
    this.leftArm = gear;
  }
}

export function $_constructor (argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const instance = new Fighter();

  const ret = new CborWriter();
  ret.encodeRef<Fighter>(instance);
  return ret.toBuffer();
}

export function $_parse(argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const origin = args.decodeStr();
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
  ret.encodeArray(instance.stash.map((s: WeaponProxy) => s.origin));
  return ret.toBuffer();
}

export function $$equipLeftHand(argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const ref = args.decodeRef<Fighter>();
  const leftHandOrigin = args.decodeStr();

  const weapon = new WeaponProxy(leftHandOrigin);
  ref.equipLeftHand(weapon);

  return new Uint8Array(0);
}
