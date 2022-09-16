export class BufferReader {
    buffer: Uint8Array;
    cursor: i32;

    constructor(buffer: Uint8Array) {
        this.buffer = buffer
        this.cursor = 0
    }

    read(bytes: i32): Uint8Array {
        if (this.buffer.byteLength < this.cursor + bytes) {
            throw new Error('buffer overflow error. not enough data')
        }

        const buf = this.buffer.slice(this.cursor, this.cursor + bytes)
        this.cursor += bytes

        return buf
    }
}
