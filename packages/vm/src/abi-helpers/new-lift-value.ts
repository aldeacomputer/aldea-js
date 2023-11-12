import {WasmContainer} from "../wasm-container.js";
import {WasmWord} from "../wasm-word.js";
import {BufReader, BufWriter} from "@aldea/core";
import {AbiType} from "./abi-helpers/abi-type.js";
import {AbiPlainObject} from "./abi-helpers/abi-plain-object.js";
import {AbiClass} from "./abi-helpers/abi-class.js";
import {ProxyDef} from "./abi-helpers/proxy-def.js";
import {BUF_RTID} from "./well-known-abi-nodes.js";

export class NewLiftValue {
  private container: WasmContainer;

  constructor (container: WasmContainer) {
    this.container = container
  }

  lift(ptr: WasmWord, ty: AbiType): Uint8Array {
    const writer = new BufWriter()
    this.liftInto(ptr, ty, writer);
    return writer.data
  }

  private liftInto(ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    switch (ty.name) {
      case 'bool':
        writer.writeU8(ptr.toNumber() === 0 ? 0 : 1)
        break
      case 'u8':
        writer.writeU8(ptr.toNumber())
        break
      case 'u16':
        writer.writeU16(ptr.toNumber())
        break
      case 'u32':
      case 'usize':
        writer.writeU32(ptr.toNumber())
        break
      case 'u64':
        writer.writeU64(ptr.toBigInt())
        break
      case 'i8':
        writer.writeI8(ptr.toNumber())
        break
      case 'i16':
        writer.writeI16(ptr.toNumber())
        break
      case 'i32':
      case 'isize':
        writer.writeI32(ptr.toNumber())
        break
      case 'i64':
        writer.writeI64(ptr.toBigInt())
        break
      case 'f32':
        writer.writeF32(ptr.toNumber())
        break
      case 'f64':
        writer.writeF64(ptr.toNumber())
        break
      case 'Array':
        this.liftArray(ptr, ty, writer)
        break
      case 'StaticArray':
        this.liftStaticArray(ptr, ty, writer)
        break
      case 'ArrayBuffer':
      case 'Uint8Array':
      case 'Uint16Array':
      case 'Uint32Array':
      case 'Uint64Array':
      case 'Int8Array':
      case 'Int16Array':
      case 'Int32Array':
      case 'Int64Array':
      case 'Float32Array':
      case 'Float64Array':
      case 'string':
      case 'Map':
      case 'Set':
      default:
        throw new Error(`not implemented ${ty.name}`)
    }
  }

  private liftArray (ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    const arrRead = this.container.mem.read(ptr, 16)
    const innerType = ty.args[0]

    const dataPtr = WasmWord.fromReader(arrRead)
    arrRead.readU32() // skip
    arrRead.readU32() // skip
    const arrLength = arrRead.readU32()

    writer.writeULEB(arrLength)

    // let offset = dataPtr
    const reader = new BufReader(this.liftBuffer(dataPtr))
    for (let i = 0; i < arrLength; i++) {
      const elemPtr = WasmWord.fromReader(reader, innerType)
      this.liftInto(elemPtr, innerType ,writer)
    }
  }
  private liftStaticArray(ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    const byteLength = this.container.mem.read(ptr.minus(4), 4).readU32()
    const bufReader = this.container.mem.read(ptr, byteLength)
    const innerType = ty.args[0]

    const arrayLength = byteLength / innerType.ownSize()
    writer.writeULEB(arrayLength)

    // let offset = dataPtr
    for (let i = 0; i < arrayLength; i++) {
      const elemPtr = WasmWord.fromReader(bufReader, innerType)
      this.liftInto(elemPtr, innerType ,writer)
    }
  }

  private liftArrayBuffer (ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    throw new Error('not implemented')
  }

  private liftTypedArray(ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    throw new Error('not implemented')
  }

  private liftString(writer: BufWriter) {
    throw new Error('not implemented')
  }

  private liftCompoundType(ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    throw new Error('not implemented')
  }

  private liftExported(ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    throw new Error('not implemented')
  }

  private liftJig(ptr: WasmWord, writer: BufWriter, cls: AbiClass) {
    throw new Error('not implemented')
  }

  private liftPlainObject(ptr: WasmWord, objDef: AbiPlainObject, writer: BufWriter) {
    throw new Error('not implemented')
  }

  private liftImported(ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    throw new Error('not implemented')
  }

  private liftProxy(writer: BufWriter, proxyDef: ProxyDef) {
    throw new Error('not implemented')
  }

  private liftMap (ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    throw new Error('not implemented')
  }

  private liftSet(ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    throw new Error('not implemented')
  }

  private liftBuffer (ptr: WasmWord): Uint8Array {
    const header = this.container.mem.read(ptr.minus(8), 8)
    const rtid = header.readU32()
    const size = header.readU32()
    if (rtid !== BUF_RTID) {
      throw new Error('not a buffer')
    }

    return this.container.mem.extract(ptr, size)
  }
}
