import { WritableBuffer, createWritableBuffer } from "./writable-buffer"

export class ResizableBuffer {
  buffer: WritableBuffer;
  chunk: i32;

  constructor(size: i32 = 1024) {
    this.buffer = createWritableBuffer(size)
    this.chunk = size
  }

  add(size: i32): WritableBuffer {
    if (size > this.buffer.data.length) {
      //const oldPtr = changetype<usize>(this.buffer)
      const chunks = ceil(size as f32 / (this.chunk as f32)) as i32
      const newBuf = createWritableBuffer(chunks * this.chunk)

      newBuf.data.set(this.buffer.data)
      this.buffer = newBuf
      //heap.free(oldPtr)
    }
    return this.buffer
  }

  export(size: i32): Uint8Array {
    if (size < this.buffer.data.length) {
      //const oldPtr = changetype<usize>(this.buffer)
      const newBuf = createWritableBuffer(size)
      newBuf.data.set(this.buffer.data.subarray(0, size))
      this.buffer = newBuf
      //heap.free(oldPtr)
    }
    return this.buffer.data
  }
}
