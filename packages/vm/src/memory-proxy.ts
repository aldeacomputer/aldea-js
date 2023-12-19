import {WasmWord} from "./wasm-word.js";
import {BufReader} from "@aldea/core";
import {ExecutionError} from "./errors.js";

export type TransferFn = (size: number) => void

/**
 * MemoryProxy class provides methods for reading and writing data from/to WebAssembly memory
 * in a nicer way.
 *
 * Reads and Writes are tracked by the vm, so the proxy executes a callback
 * to let the vm know how much data was moved.
 */
export class MemoryProxy {
  _mem: WebAssembly.Memory
  private onDataMoved: TransferFn;

  /**
   * Constructor for the class.
   *
   * @param {WebAssembly.Memory} mem - The WebAssembly memory object.
   * @param {TransferFn} registerTransfer - Callback executed when data is moved in or out this memory.
   */
  constructor (mem: WebAssembly.Memory, registerTransfer: TransferFn) {
    this._mem = mem
    this.onDataMoved = registerTransfer
  }

  /**
   * Writes data to the WebAssembly memory starting from the specified pointer.
   *
   * @param {WasmWord} ptr - The pointer indicating the starting position in memory.
   * @param {Uint8Array} data - The data to be written to memory.
   * @throws {ExecutionError} If the memory pointer is less than 0 or the memory access is out of bounds.
   */
  write(ptr: WasmWord, data: Uint8Array) {
    this.onDataMoved(data.byteLength)
    let start = ptr.toInt()
    if (start < 0) {
      throw new ExecutionError('Memory ptr should never be less than 0')
    }
    let end = start + data.byteLength
    if (end > this._mem.buffer.byteLength) {
      throw new ExecutionError(`Memory access out of bounds: ${end}`)
    }

    const view = new Uint8Array(
      this._mem.buffer,
      ptr.toInt(),
      data.byteLength
    )
    view.set(data)
  }

  /**
   * Copies a buffer from memory.
   *
   * @param {WasmWord} ptr - The starting pointer of the memory to extract.
   * @param {number} length - The length of the memory to extract.
   * @returns {Uint8Array} - The extracted memory as a Uint8Array.
   * @throws {ExecutionError} - If the memory pointer is less than 0 or the memory access is out of bounds.
   */
  extract(ptr: WasmWord, length: number): Uint8Array {
    this.onDataMoved(length)
    let start = ptr.toInt()
    if (start < 0) {
      throw new ExecutionError('Memory ptr should never be less than 0')
    }
    let end = start + length
    if (end > this._mem.buffer.byteLength) {
      throw new ExecutionError(`Memory access out of bounds: ${end}`)
    }

    let response = new Uint8Array(length)
    response.set(new Uint8Array(this._mem.buffer, start, length))
    return response
  }

  /**
   * Copies a buffer from memory and wraps into a reader.
   *
   * @param {WasmWord} ptr - The memory pointer to start reading from.
   * @param {number} length - The number of bytes to read from the memory.
   * @return {BufReader} - A BufReader object containing the read buffer.
   */
  read(ptr: WasmWord, length: number): BufReader {
    this.onDataMoved(length)
    return new BufReader(this.extract(ptr, length))
  }

  /**
   * Reads a specific number from memory. This is used mainly for debug purposes.
   *
   * @param {number} n - The starting index of the memory block.
   * @param {number} size - The size of the number to read (default is 1).
   * @returns {number} - The read number.
   * @throws {Error} - Throws an error if the size is not 1, 2, 4, or 8.
   */
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
