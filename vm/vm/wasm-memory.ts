import {JigPointer} from "./jig-ref.js";

interface MemoryLayout {
  [field: string]: {
    align: 0 | 1 | 2 | 3;
    offset: number;
  }
}

export class WasmMemory {
  memory: WebAssembly.Memory
  private instance: WebAssembly.Instance;

  constructor (instance: WebAssembly.Instance) {
    this.memory = instance.exports.memory as WebAssembly.Memory
    this.instance = instance
  }


  liftString(ptr: number): string {
    const end = ptr + new Uint32Array(this.memory.buffer)[ptr - 4 >>> 2] >>> 1
    const memU16 = new Uint16Array(this.memory.buffer)
    let start = ptr >>> 1, string = "";
    while (end - start > 1024) {
      string += String.fromCharCode(...memU16.subarray(start, start += 1024))
    }
    return string + String.fromCharCode(...memU16.subarray(start, end))
  }

  lowerString(val: string): number {
    const newF = this.instance.exports.__new as Function;
    const ptr = newF(val.length << 1, 1) >>> 0
    const memU16 = new Uint16Array(this.memory.buffer);
    for (let i = 0; i < val.length; ++i) {
      memU16[(ptr >>> 1) + i] = val.charCodeAt(i)
    }
    return ptr
  }

  liftBuffer (pointer: number): Uint8Array {
    const memoryU32 = new Uint32Array(this.memory.buffer);
    return new Uint8Array(
      this.memory.buffer,
      memoryU32[pointer + 4 >>> 2],
      memoryU32[pointer + 8 >>> 2]
    ).slice();
  }

  lowerBuffer (values: Uint8Array): number {
    const instance = this.instance
    const pin = instance.exports.__pin as Function;
    const newFunction = instance.exports.__new as Function;
    const unpin = instance.exports.__unpin as Function;

    const
      length = values.length,
      buffer = pin(newFunction(length, 0)),
      header = newFunction(12, 3),
      memoryU32 = new Uint32Array(this.memory.buffer);
    memoryU32[header + 0 >>> 2] = buffer;
    memoryU32[header + 4 >>> 2] = buffer;
    memoryU32[header + 8 >>> 2] = length << 0;
    new Uint8Array(this.memory.buffer, buffer, length).set(values);
    unpin(buffer);
    return header;
  }

  liftInternalRef(pointer: number): JigPointer {
    return new Internref(obj.name, ptr)
  }
}
