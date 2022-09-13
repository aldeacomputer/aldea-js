import {CborReader} from "./cbor_reader";
import {CborWriter} from "./cbor-writer";

class Sword {
    name: string;
    power: u32;

    constructor (name: string) {
        this.name = name;
        this.power = 1;
    }

    sharp (): void {
        this.power++;
    }

    getPower (): u32 {
        return this.power;
    }
}

export function $_constructor (argBuf: Uint8Array): Uint8Array {
    const cbor = new CborReader(argBuf);
    const name = cbor.decodeStr();

    const instance = new Sword(name);

    const ret = new CborWriter();
    ret.encodeRef<Sword>(instance);
    return ret.toBuffer();
}

export function $$sharp (argBuf: Uint8Array): Uint8Array {
    // parse
    const cbor = new CborReader(argBuf);
    const instance = cbor.decodeRef<Sword>();

    // message send
    instance.sharp();

    // return void
    return new Uint8Array(0);
}

export function $$getPower (argBuf: Uint8Array): Uint8Array {
    // parse
    const cbor = new CborReader(argBuf);
    const instance = cbor.decodeRef<Sword>();

    // message send
    const response = instance.getPower();

    // return void
    const writer = new CborWriter();
    writer.encodeInt(response);
    return writer.toBuffer();
}

export function $_parse(argBuf: Uint8Array): Uint8Array {
    // Read all args
    const args = new CborReader(argBuf)
    const name = args.decodeStr()
    const power = args.decodeInt() as u8

    // Create pointer and manually write class to memory
    const ptr = __new(offsetof<Sword>(), idof<Sword>())
    store<u32>(ptr + offsetof<Sword>('name'), changetype<u32>(name))
    store<u8>(ptr + offsetof<Sword>('power'), power)

    // Write return buffer
    const retn = new CborWriter()
    retn.encodeRef<u32>(ptr as u32)
    return retn.toBuffer()
}

export function $$serialize(argBuf: Uint8Array): Uint8Array {
    // Read all args
    const args = new CborReader(argBuf)
    const sword = args.decodeRef<Sword>()

    // Write return buffer
    const retn = new CborWriter()           // create arg writer
    retn.encodeStr(sword.name)              // encode all props in sequence
    retn.encodeInt(sword.power as isize)
    return retn.toBuffer()
}
