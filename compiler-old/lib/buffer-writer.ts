export class BufferWriter {
  buffers: Uint8Array[];
  length: u32;

  constructor(buffers: Uint8Array[] = []) {
    this.buffers = buffers
    this.length = 0
  }

  push(buf: Uint8Array): BufferWriter {
    this.buffers.push(buf)
    this.length += buf.length
    return this
  }

  toBuffer(): Uint8Array {
    const data = new Uint8Array(this.length)
    let offset = 0

    for (let i = 0; i < this.buffers.length; i++) {
      const buf = this.buffers[i]
      data.set(buf, offset)
      offset += buf.length
    }

    return data
  }
}
