import { WritableBuffer, createWritableBuffer } from "./writable-buffer"

export class ConcatBuffer {
  buffers: WritableBuffer[];
  length: i32;

  constructor() {
    this.buffers = []
    this.length = 0
  }

  add(size: i32): WritableBuffer {
    const buffer = createWritableBuffer(size)
    this.buffers.push(buffer)
    this.length += buffer.data.length
    return buffer
  }

  export(): Uint8Array {
    const data = new Uint8Array(this.length)
    let offset = 0

    for (let i = 0; i < this.buffers.length; i++) {
      const buf = this.buffers[i]
      data.set(buf.data, offset)
      offset += buf.data.length
    }

    return data
  }
}
