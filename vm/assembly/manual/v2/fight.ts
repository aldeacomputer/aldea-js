import {CborReader} from "../cbor_reader";
import {CborWriter} from "../cbor-writer";

// @ts-ignore
// @external("$aldea", "newInstance")
// declare function aldeaCreate(args: Uint8Array): Uint8Array;
// function createInstance (moduleName:string, argBuf: Uint8Array): string {
//   const writer = new CborWriter();
//   writer.encodeStr(moduleName);
//   writer.encodeBuf(argBuf);
//   const responseBuf = aldeaCreate(writer.toBuffer());
//   return new CborReader(responseBuf).decodeStr();
// }

// @ts-ignore
@external("vm", "vm_call")
declare function callMethod(args: Uint8Array): Uint8Array;

// @ts-ignore
@external("vm", "vm_adopt")
declare function adoptJig(buffPointer: Uint8Array): Uint8Array;

function adopt(childOrigin: string): void {
  const cbor = new CborWriter();
  cbor.encodeStr(childOrigin);
  adoptJig(cbor.toBuffer());
}

// @ts-ignore
// @external("$aldea", "releaseJig")
// declare function releaseJig(buffPointer: Uint8Array): Uint8Array;
//
// function release<T>(childOrigin: string, parent: T): void {
//   const cbor = new CborWriter();
//   cbor.encodeStr(childOrigin);
//   cbor.encodeRef<T>(parent);
//   releaseJig(cbor.toBuffer());
// }

class FighterProxy {
  origin: string;

  constructor(origin: string) {
    this.origin = origin
  }

  getAttackPower (): u8 {
    const writer = new CborWriter()
    writer.encodeStr(this.origin);
    writer.encodeStr('getAttackPower');
    writer.encodeBuf(new Uint8Array(0));
    const buff = writer.toBuffer();
    const retBuf = callMethod(buff);
    const retReader = new CborReader(retBuf);
    return retReader.decodeInt() as u8;
  }

  takeDamage (damage: u8): void {
    const params = new CborWriter()
      .encodeInt(damage)
      .toBuffer();

    const writer = new CborWriter()
    writer.encodeStr(this.origin);
    writer.encodeStr('takeDamage');
    writer.encodeBuf(params);
    const buff = writer.toBuffer();
    callMethod(buff);
  }
}

class Fight {
  fighters: Array<FighterProxy>;

  constructor() {
    this.fighters = [];
  }

  addParticipant (fighter: FighterProxy): void {
    if (this.fighters.length > 2) {
      throw new Error('cannot have more than 2 fighters')
    }
    adopt(fighter.origin);
    this.fighters.push(fighter);
  }

  playTurn (): void {
    if (this.fighters.length < 2) {
      throw new Error('cannot play if there is not 2 participants');
    }

    const current = this.fighters.pop();
    const receiver = this.fighters.pop();
    const damage = current.getAttackPower();
    receiver.takeDamage(damage);
    this.fighters.push(receiver);
    this.fighters.push(current);
  }
}

export function Fight_constructor (_argBuf: Uint8Array): Uint8Array {
  const instance = new Fight();

  const ret = new CborWriter();
  ret.encodeRef<Fight>(instance);
  return ret.toBuffer();
}

export function Fight_deserialize(argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const origins = args.decodeArray();
  const fighters = origins.map((origin: string) => new FighterProxy(origin))

  const ptr = __new(offsetof<Fight>(), idof<Fight>());
  store<u32>(ptr + offsetof<Fight>('fighters'), changetype<usize>(fighters));

  const ret = new CborWriter();
  ret.encodeRef<u32>(ptr as u32);
  return ret.toBuffer();
}

export function Fight$serialize(argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const instance = args.decodeRef<Fight>();

  const ret = new CborWriter();
  ret.encodeArray(instance.fighters.map((s: FighterProxy) => s.origin));
  return ret.toBuffer();
}

export function Fight$addParticipant(argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const ref = args.decodeRef<Fight>();
  const fighterOrigin = args.decodeStr();

  const fighter = new FighterProxy(fighterOrigin);
  ref.addParticipant(fighter);

  return new Uint8Array(0);
}

export function Fight$playTurn(argBuf: Uint8Array): Uint8Array {
  const args = new CborReader(argBuf);
  const ref = args.decodeRef<Fight>();

  ref.playTurn();

  return new Uint8Array(0);
}
