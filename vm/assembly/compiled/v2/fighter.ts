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
@external("$aldea", "callMethod")
declare function callMethod(args: Uint8Array): Uint8Array;

// @ts-ignore
@external("$aldea", "adoptJig")
declare function adoptJig(buffPointer: Uint8Array): Uint8Array;

function adopt(childOrigin: string): void {
  const cbor = new CborWriter();
  cbor.encodeStr(childOrigin);
  adoptJig(cbor.toBuffer());
}

// @ts-ignore
@external("$aldea", "releaseJig")
declare function releaseJig(buffPointer: Uint8Array): Uint8Array;

function release<T>(childOrigin: string, parent: T): void {
  const cbor = new CborWriter();
  cbor.encodeStr(childOrigin);
  cbor.encodeRef<T>(parent);
  releaseJig(cbor.toBuffer());
}

class WeaponProxy {
  origin: string;

  constructor (origin: string) {
    this.origin = origin
  }

  getPower (): u8 {
    const writer = new CborWriter()
    writer.encodeStr(this.origin);
    writer.encodeStr('getPower');
    writer.encodeBuf(new Uint8Array(0));
    const buff = writer.toBuffer();
    const retBuf = callMethod(buff);
    const retReader = new CborReader(retBuf);
    return retReader.decodeInt() as u8;
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

  getAttackPower (): u8 {
    return 1 + this.leftArm.getPower()
  }

  releaseSomething (): void {
    const item = this.stash.pop();
    release<Fighter>(item.origin, this);
  }

  takeDamage (damage: u8): void {
    this.health -= damage;
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

export function $$releaseSomething(argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const ref = args.decodeRef<Fighter>();

  ref.releaseSomething();

  return new Uint8Array(0);
}

export function $$getAttackPower (argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const ref = args.decodeRef<Fighter>();

  const res = ref.getAttackPower();

  const ret = new CborWriter();
  ret.encodeInt(res);
  return ret.toBuffer();
}
