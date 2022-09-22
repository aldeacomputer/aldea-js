export class BufferReader {
    constructor(buffer) {
        this.buffer = buffer;
        this.cursor = 0;
    }
    read(bytes) {
        if (this.buffer.byteLength < this.cursor + bytes) {
            throw new Error('buffer overflow error. not enough data');
        }
        const buf = this.buffer.slice(this.cursor, this.cursor + bytes);
        this.cursor += bytes;
        return buf;
    }
}
