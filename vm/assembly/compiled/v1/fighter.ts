import {CborReader} from "../cbor_reader";
import {CborWriter} from "../cbor-writer";

// @ts-ignore
@external("$aldea", "callMethod")
declare function callMethod(args: Uint8Array): Uint8Array;

class Fighter {
    name: string;
    health: u32;
    sword: SwordProxy | null;

    constructor(name: string) {
        this.name = name;
        this.health = 100;
        this.sword = null;
    }

    equip (aSword: SwordProxy): void {
        this.sword = aSword;
    }

    getPower (): u32 {
        const sword = this.sword;
        const swordDamage = sword === null ? 0 : sword.getPower();
        return 1 + swordDamage;
    }

    sharpSword (): void {
        const sword = this.sword;
        if (sword === null) {
            throw new Error('no sword');
        }
        sword.sharp();
        this.health--;
    }

    takeDamage (damage: u32): void {
        this.health = this.health - damage
    }

    attack (enemy: FighterProxy): void {
        enemy.takeDamage(
            this.getPower()
        );
    }
}

class SwordProxy {
    origin: string;

    constructor (origin: string) {
        this.origin = origin;
    }

    sharp (): void {
        const writer = new CborWriter()
        writer.encodeStr(this.origin);
        writer.encodeStr('sharp');
        writer.encodeBuf(new Uint8Array(0));
        const buff = writer.toBuffer();
        callMethod(buff);
    }

    getPower (): u32 {
        const writer = new CborWriter()
        writer.encodeStr(this.origin);
        writer.encodeStr('getPower');
        writer.encodeBuf(new Uint8Array(0));
        const buff = writer.toBuffer();
        const retBuf = callMethod(buff);
        const retReader = new CborReader(retBuf);
        return retReader.decodeInt() as u32;
    }
}

class FighterProxy {
    origin: string;

    constructor(origin: string) {
        this.origin = origin;
    }

    equip (_aSword: SwordProxy): void {}

    getPower (): u32 { return 0 }

    sharpSword (): void {}

    takeDamage (damage: u32): void {
        const writer = new CborWriter()
        writer.encodeStr(this.origin);
        writer.encodeStr('takeDamage');
        const methodArgsBuf = new CborWriter().encodeInt(damage).toBuffer()
        writer.encodeBuf(methodArgsBuf);
        const buff = writer.toBuffer();
        callMethod(buff);
    }

    attack (_enemy: Fighter): void {}
}

export function $_constructor (argBuf: Uint8Array): Uint8Array {
    const cbor = new CborReader(argBuf);
    const name = cbor.decodeStr();

    const instance = new Fighter(name);

    const ret = new CborWriter();
    ret.encodeRef<Fighter>(instance);
    return ret.toBuffer();
}

export function $$equip (argBuf: Uint8Array): Uint8Array {
    const cbor = new CborReader(argBuf);
    const instance = cbor.decodeRef<Fighter>();
    const swordOrigin = cbor.decodeStr();

    const sword = new SwordProxy(swordOrigin);
    instance.equip(sword);

    const ret = new CborWriter();
    ret.encodeRef<Fighter>(instance);
    return ret.toBuffer();
}

export function $$sharpSword (argBuf: Uint8Array): Uint8Array {
    const cbor = new CborReader(argBuf);
    const instance = cbor.decodeRef<Fighter>();

    instance.sharpSword();

    const ret = new CborWriter();
    ret.encodeRef<Fighter>(instance);
    return ret.toBuffer();
}

export function $$getPower (argBuf: Uint8Array): Uint8Array {
    const cbor = new CborReader(argBuf);
    const instance = cbor.decodeRef<Fighter>();

    const result = instance.getPower();

    const ret = new CborWriter();
    ret.encodeInt(result);
    return ret.toBuffer();
}

export function $$attack (argBuf: Uint8Array): Uint8Array {
    const cbor = new CborReader(argBuf);
    const instance = cbor.decodeRef<Fighter>();
    const enemyOrigin = cbor.decodeStr();

    const enemy = new FighterProxy(enemyOrigin);
    instance.attack(enemy);

    return new Uint8Array(0);
}

export function $$takeDamage (argBuf: Uint8Array): Uint8Array {
    const cbor = new CborReader(argBuf);
    const instance = cbor.decodeRef<Fighter>();
    const damage = cbor.decodeInt() as u32;

    instance.takeDamage(damage);

    return new Uint8Array(0);
}

export function $_parse(argBuf: Uint8Array): Uint8Array {
    // Read all args
    const args = new CborReader(argBuf);
    const name = args.decodeStr();
    const health = args.decodeInt() as u32;
    let swordOrNull : SwordProxy | null;
    if (args.decodeNull()) {
        swordOrNull = null;
    } else {
        swordOrNull = new SwordProxy(args.decodeStr());
    }

    // Create pointer and manually write class to memory
    const ptr = __new(offsetof<Fighter>(), idof<Fighter>());
    store<u32>(ptr + offsetof<Fighter>('name'), changetype<u32>(name));
    store<u32>(ptr + offsetof<Fighter>('health'), health);

    const instance = changetype<Fighter>(ptr);
    if (swordOrNull !== null) {
        instance.equip(swordOrNull);
    }

    // Write return buffer
    const retn = new CborWriter();
    retn.encodeRef<u32>(ptr as u32);
    return retn.toBuffer();
}

export function $$serialize(argBuf: Uint8Array): Uint8Array {
    // Read all args
    const args = new CborReader(argBuf)
    const instance = args.decodeRef<Fighter>()
    const sword = instance.sword

    // Write return buffer
    const retn = new CborWriter();
    retn.encodeStr(instance.name);
    retn.encodeInt(instance.health);
    if (sword === null) {
        retn.encodeNull();
    } else {
        retn.encodeStr(sword.origin);
    }

    return retn.toBuffer()
}