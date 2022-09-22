export class ResizableBuffer {
  private chunk: i32;
  data: Uint8Array;
  view: DataView;

  constructor(size: i32 = 1024) {
    this.chunk = size
    this.data = new Uint8Array(this.chunk)
    this.view = asDataView(this.data)
  }

  get(size: i32): ResizableBuffer {
    if (size > this.data.length) {
      const oldPtr = changetype<usize>(this.data)
      const chunks = ceil(size as f32 / (this.chunk as f32)) as i32
      const newData = new Uint8Array(chunks * this.chunk)
      newData.set(this.data)
      this.data = newData
      this.view = asDataView(this.data)
      heap.free(oldPtr)
    }
    return this
  }

  trim(size: i32): ResizableBuffer {
    if (size < this.data.length) {
      const oldPtr = changetype<usize>(this.data)
      this.data = this.data.subarray(0, size)
      this.view = asDataView(this.data)
      heap.free(oldPtr)
    }
    return this
  }
}

function asDataView(data: Uint8Array): DataView {
  return new DataView(data.buffer, data.byteOffset, data.byteLength)
}
