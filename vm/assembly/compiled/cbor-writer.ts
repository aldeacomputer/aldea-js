import { BufferWriter } from './buffer_writter';

export class CborWriter extends BufferWriter {
    encodeInt(val: isize): CborWriter {
        if (val >= 0) {
            return this.writeHead(0, val)
        } else {
            return this.writeHead(1, -(val + 1))
        }
    }

    encodeBuf(val: Uint8Array): CborWriter {
        this.writeHead(2, val.length).push(val)
        return this
    }

    encodeStr(val: string): CborWriter {
        const buf = Uint8Array.wrap(String.UTF8.encode(val))
        this.writeHead(3, buf.length).push(buf)
        return this
    }

    encodeRef<T>(val: T): CborWriter {
        const ref = changetype<usize>(val)
        return this.writeHead(6, 42).encodeInt(ref)
    }

    encodeNull(): CborWriter {
        this.writeU8((7 << 5) | 24)
        this.writeU8(22)
        return this;
    }

    writeHead(type: u8, val: usize): CborWriter {
        if (val < 24) {
            this.writeU8((type << 5) | val as u8)
        } else if (val <= 0xFF) {
            this.writeU8((type << 5) | 24).writeU8(val as u8)
        } else if (val <= 0xFFFF) {
            this.writeU8((type << 5) | 25).writeU16(val as u16)
        } else if (val <= 0xFFFFFFFF) {
            this.writeU8((type << 5) | 26).writeU32(val as u32)
        } else {
            throw new Error('eeek no 64bit ints right now pls')
            //this.writeU8((type << 5) | 27).writeU64(val as u64)
        }
        return this
    }

    writeU8(num: u8): CborWriter {
        const buf = new ArrayBuffer(1)
        new DataView(buf).setUint8(0, num)
        this.push(Uint8Array.wrap(buf))
        return this
    }


    writeU16(num: u16): CborWriter {
        const buf = new ArrayBuffer(2)
        new DataView(buf).setUint16(0, num)
        this.push(Uint8Array.wrap(buf))
        return this
    }

    writeU32(num: u32): CborWriter {
        const buf = new ArrayBuffer(4)
        new DataView(buf).setUint32(0, num)
        this.push(Uint8Array.wrap(buf))
        return this
    }

    writeU64(num: u64): CborWriter {
        const buf = new ArrayBuffer(8)
        new DataView(buf).setUint64(0, num)
        this.push(Uint8Array.wrap(buf))
        return this
    }
}