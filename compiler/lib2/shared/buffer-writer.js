import { ResizableBuffer } from "./resizable-buffer";
export class BufferWriter {
    constructor(buffer = new ResizableBuffer(512), start = 0) {
        this.buffer = buffer;
        this.index = start;
    }
    ensure(size) {
        return this.buffer.get(size + this.index);
    }
    writeBytes(bytes) {
        this.ensure(bytes.length).data.set(bytes, this.index);
        this.index += bytes.length;
        return this;
    }
    writeF32(val) {
        this.ensure(4).view.setFloat32(this.index, val);
        this.index += 4;
        return this;
    }
    writeF64(val) {
        this.ensure(8).view.setFloat64(this.index, val);
        this.index += 8;
        return this;
    }
    writeI8(val) {
        this.ensure(1).view.setInt8(this.index, val);
        this.index += 1;
        return this;
    }
    writeI16(val) {
        this.ensure(2).view.setInt16(this.index, val);
        this.index += 2;
        return this;
    }
    writeI32(val) {
        this.ensure(4).view.setInt32(this.index, val);
        this.index += 4;
        return this;
    }
    writeI64(val) {
        this.ensure(8).view.setInt64(this.index, val);
        this.index += 8;
        return this;
    }
    writeU8(val) {
        this.ensure(1).view.setUint8(this.index, val);
        this.index += 1;
        return this;
    }
    writeU16(val) {
        this.ensure(2).view.setUint16(this.index, val);
        this.index += 2;
        return this;
    }
    writeU32(val) {
        this.ensure(4).view.setUint32(this.index, val);
        this.index += 4;
        return this;
    }
    writeU64(val) {
        this.ensure(8).view.setUint64(this.index, val);
        this.index += 8;
        return this;
    }
    toBytes() {
        return this.buffer.trim(this.index).data;
    }
}
