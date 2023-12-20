import {AbiType} from "./memory/abi-helpers/abi-type.js";
import {BufReader, BufWriter} from "@aldea/core";

/**
 * Represents an argument that can be passed to a WebAssembly function.
 * Wasm u64 are represented by `bigint` in JavaScript. Choosing between
 * `number` and `bigint` is done dynamically by the VM.
 * @typedef {(number | bigint)} WasmArg
 */
export type WasmArg = number | bigint

/**
 * Represents a word in WebAssembly, which can be a number or a bigint.
 * A word in a CPU context is the size of a register or the amount of data
 * that is used in an atomic operation.
 *
 * This class is used as an intermediary between WASM and JS, and it has
 * all kind of utility methods to move between one world and the other.
 */
export class WasmWord {
  /* Data is internally saved as 8 bytes */
  private value: ArrayBuffer;

  /**
   * Constructs a WasmWord from an ArrayBuffer.
   * The ArrayBuffer should not be longer than 8 bytes.
   * @param {ArrayBuffer} bytes - The ArrayBuffer to construct the WasmWord from.
   * @throws {Error} If the ArrayBuffer is longer than 8 bytes.
   */
  constructor (bytes: ArrayBuffer) {
    if (bytes.byteLength > 8) {
      throw new Error('wrong number of bytes')
    }
    this.value = new ArrayBuffer(8)
    Buffer.from(this.value).set(Buffer.from(bytes))
  }

  /**
   * Constructs a WasmWord from a number. The number can be a float or an integer, and the
   * representation gets automatically chosen.
   *
   * @param {number} number - The number to construct the WasmWord from.
   * @returns {WasmWord} The constructed WasmWord.
   */
  static fromNumber (number: number): WasmWord {
    const w = new BufWriter({ size: 8 })
    if (Number.isInteger(number)) {
      w.writeU64(number)
    } else {
      w.writeF64(number)
    }
    return new this(w.data)
  }

  /**
   * Creates a new instance of `WasmWord` from a `bigint` value.
   *
   * @param {bigint} bigint - The `bigint` value to convert.
   * @returns {WasmWord} - A new instance of `WasmWord`.
   */
  static fromBigInt (bigint: bigint): WasmWord {
    const w = new BufWriter({size: 8})
    w.writeU64(bigint)
    return new this(w.data)
  }

  /**
   * Converts a numeric (`number` or `bigint`) value to a `WasmWord`.
   *
   * @param {WasmArg} value - The numeric value to convert.
   * @return {WasmWord} - The converted WasmWord.
   */
  static fromNumeric (value: WasmArg): WasmWord {
    if (typeof value === 'bigint') {
      return this.fromBigInt(value)
    } else {
      return this.fromNumber(Number(value))
    }
  }

  /**
   * Creates a new WasmWord instance from a BufReader. It needs the type
   * of the value to know the size.
   *
   * @param {BufReader} read - The BufReader to read from.
   * @param {AbiType} ty - The AbiType used to determine the size of the fixed bytes.
   * @return {WasmWord} A new WasmWord instance.
   */
  static fromReader (read: BufReader, ty: AbiType = AbiType.fromName('u32')): WasmWord {
    return new WasmWord(read.readFixedBytes(ty.ownSize()))
  }

  /**
   * Converts the WasmWord to a signed integer.
   * @returns {number} The integer representation of the WasmWord.
   */
  toInt (): number {
    return Buffer.from(this.value).readInt32LE()
  }

  /**
   * Converts the WasmWord to an unsigned integer.
   * @returns {number} The unsigned integer representation of the WasmWord.
   */
  toUInt (): number {
    return Buffer.from(this.value).readUInt32LE()
  }

  /**
   * Converts the WasmWord to a float.
   * @returns {number} The float representation of the WasmWord.
   */
  toFloat (): number {
    return new BufReader(new Uint8Array(this.value)).readF64()
  }

  /**
   * Converts the WasmWord to a bigint.
   * @returns {bigint} The bigint representation of the WasmWord.
   */
  toBigInt (): bigint {
    return Buffer.from(this.value).readBigInt64LE()
  }

  /**
   * Converts the WasmWord to a boolean.
   * @returns {boolean} The boolean representation of the WasmWord. Returns true if the integer representation of the WasmWord is not 0, false otherwise.
   */
  toBool (): boolean {
    return this.toInt() !== 0
  }

  /**
   * Adds a number to the WasmWord. This can be used for pointer arithmetic.
   * It interprets the content of the word as integet to make the addition.
   *
   * @param {number} n - The number to add to the WasmWord.
   * @returns {WasmWord} A new WasmWord that is the result of the addition.
   */
  plus(n: number): WasmWord {
    let num = Buffer.from(this.value).readUInt32LE()
    return WasmWord.fromNumber(num + n)
  }

  /**
   * Subtracts a number from the WasmWord. It can be used for pointer arithmetic.
   * It interprets the word as an integer.
   *
   * @param {number} n - The number to subtract from the WasmWord.
   * @returns {WasmWord} A new WasmWord that is the result of the subtraction.
   */
  minus(n: number): WasmWord {
    let num = this.toInt()
    return WasmWord.fromNumber(num - n)
  }

  /**
   * Aligns the WasmWord to a specified size. Align basically means make it a multiple of the given size.
   * This is useful for memory operations.
   * If the WasmWord is already aligned to the specified size, it returns the WasmWord itself.
   * Otherwise, it returns a new WasmWord which integer representation is alligned.
   * @param {number} toSize - The size to align the WasmWord to the desired number.
   * @returns {WasmWord} The aligned WasmWord.
   */
  align (toSize: number): WasmWord {
    const self = this.toInt()
    const rem = self % toSize
    if (rem === 0) {
      return this
    } else {
      return WasmWord.fromNumber(self + toSize - rem)
    }
  }

  /**
   * Serializes the WasmWord to a Uint8Array. It needs a type to know the size of the value.
   * @param {AbiType} ty - The ABI type to determine the length of the Uint8Array.
   * @returns {Uint8Array} The serialized Uint8Array.
   */
  serialize(ty: AbiType): Uint8Array {
    return new Uint8Array(this.value, 0, ty.ownSize())
  }

  /**
   * Converts the WasmWord to a WasmArg. This is used to send the word to the WasmContainer.
   * It needs a type to determine the right way to convert the WasmWord.
   *
   * @param {AbiType} abiType - The ABI type to determine the type of the WasmArg.
   * @returns {WasmArg} The WasmArg representation of the WasmWord.
   */
  toWasmArg (abiType: AbiType): WasmArg {
    if (['u64', 'i64'].includes(abiType.name)) return this.toBigInt()
    if ('f32' === abiType.name) return this.toFloat()
    if ('f64' === abiType.name) return this.toFloat()
    return this.toInt()
  }

  /**
   * Checks if the WasmWord is equal to another WasmWord.
   * @param {WasmWord} another - The other WasmWord to compare with.
   * @returns {boolean} True if the two WasmWords are equal, false otherwise.
   */
  equals (another: WasmWord) {
    return Buffer.from(this.value).equals(Buffer.from(another.value));
  }

  /**
   * Constructs a WasmWord representing a null pointer.
   * @returns {WasmWord} The null WasmWord.
   */
  static null () {
    return this.fromNumber(0)
  }
}
