import { BufferReader } from './buffer_reader';

export class CborReader extends BufferReader {
    view: DataView;

    constructor(buffer: Uint8Array) {
        super(buffer)
        this.view = new DataView(this.buffer.buffer)
    }

    decodeBuf(): Uint8Array {
        const head = this.readHead()
        const type = head[0]
        const info = head[1]
        const length = this.readLength(info)

        if (type == 2) {
            return this.read(length as i32)
        } else {
            throw new Error('not buffer')
        }
    }

    decodeStr(): string {
        const head = this.readHead()
        const type = head[0]
        const info = head[1]
        const length = this.readLength(info)

        if (type === 3) {
            const buf = this.read(length as i32)
            return String.UTF8.decode(buf.buffer)
        } else {
            throw new Error('not string')
        }
    }

    decodeInt(): isize {
        const head = this.readHead()
        const type = head[0]
        const info = head[1]
        const length = this.readLength(info)

        if (type == 0) { return length }
        if (type == 1) { return -1-length }
        throw new Error('not integer')
    }

    decodeRef<T>(): T {
        const head = this.readHead()
        const type = head[0]
        const info = head[1]
        const tag = this.readLength(info)

        if (type == 6 && tag == 42) {
            const ref = this.decodeInt() as u32
            return changetype<T>(ref)
        } else {
            throw new Error('not ref tag '+tag.toString())
        }
    }

    decodeNull (): boolean {
        const head = this.view.getUint8(this.cursor)
        const data = this.view.getUint8(this.cursor + 1)
        const type = head >> 5
        const value = head & 0x1F
        if (type === 7 && value === 24 && data === 22) {
            this.cursor++;
            this.cursor++;
            return true
        }
        return false;
    }

    readHead(): u8[] {
        const head = this.readU8()
        const ret = new Array<u8>(2)
        ret[0] = head >> 5
        ret[1] = head & 0x1F
        return ret
    }

    readLength(info: u8): usize {
        if (info < 24)  { return info }
        if (info == 24) { return this.readU8() }
        if (info == 25) { return this.readU16() }
        if (info == 26) { return this.readU32() }
        //if (info == 27) { return this.readU64() }

        throw new Error('tbc')
    }

    readU8(): u8 {
        const int = this.view.getUint8(this.cursor)
        this.cursor += 1
        return int
    }

    readU16(): u16 {
        const int = this.view.getUint16(this.cursor)
        this.cursor += 2
        return int
    }

    readU32(): u32 {
        const int = this.view.getUint32(this.cursor)
        this.cursor += 4
        return int
    }

    readU64(): u64 {
        const int = this.view.getUint64(this.cursor)
        this.cursor += 8
        return int
    }
}