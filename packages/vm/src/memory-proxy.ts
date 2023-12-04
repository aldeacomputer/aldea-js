import {WasmWord} from "./wasm-word.js";
import {BufReader} from "@aldea/core";

export type TransferFn = (size: number) => void

export class MemoryProxy {
  _mem: WebAssembly.Memory
  private onDataMoved: TransferFn;

  constructor (mem: WebAssembly.Memory, registerTransfer: TransferFn) {
    this._mem = mem
    this.onDataMoved = registerTransfer
  }

  write(ptr: WasmWord, data: Uint8Array) {
    this.onDataMoved(data.byteLength)
    let start = ptr.toInt()
    if (start < 0) {
      throw new Error('Memory ptr should never be less than 0')
    }
    let end = start + data.byteLength
    if (end > this._mem.buffer.byteLength) {
      throw new Error(`Memory access out of bounds: ${end}`)
    }

    const view = new Uint8Array(
      this._mem.buffer,
      ptr.toInt(),
      data.byteLength
    )
    view.set(data)
  }

  extract(ptr: WasmWord, length: number): Uint8Array {
    this.onDataMoved(length)
    let start = ptr.toInt()
    if (start < 0) {
      throw new Error('Memory ptr should never be less than 0')
    }
    let end = start + length
    if (end > this._mem.buffer.byteLength) {
      throw new Error(`Memory access out of bounds: ${end}`)
    }

    let response = new Uint8Array(length)
    response.set(new Uint8Array(this._mem.buffer, start, length))
    return response
  }

  read(ptr: WasmWord, length: number): BufReader {
    this.onDataMoved(length)
    return new BufReader(this.extract(ptr, length))
  }

  at(n: number, size: number = 1): number {
    const view = Buffer.from(new Uint8Array(this._mem.buffer, n, size));
    if (size === 1) {
      return view.readUint8()
    } else
    if (size === 2) {
      return view.readUInt16LE()
    } else
    if (size === 4) {
      return view.readUInt32LE()
    } else
    if (size === 8) {
      return Number(view.readBigUint64LE())
    }
    else {
      throw new Error('wrong number size')
    }
  }
}
