export declare class WritableBuffer {
  data: Uint8Array;
  view: DataView;
}

export function createWritableBuffer(length: i32): WritableBuffer {
  const data = new Uint8Array(length)
  return {
    data,
    view: new DataView(data.buffer, data.byteOffset, data.byteLength)
  }
}
