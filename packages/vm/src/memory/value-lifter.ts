import {WasmContainer} from "../wasm-container.js";
import {WasmWord} from "../wasm-word.js";
import {BufWriter} from "@aldea/core";
import {AbiType} from "./abi-helpers/abi-type.js";
import {AbiPlainObject} from "./abi-helpers/abi-plain-object.js";
import {AbiClass} from "./abi-helpers/abi-class.js";
import {BUF_RTID} from "./well-known-abi-nodes.js";
import {ExecutionError} from "../errors.js";
import {CodeKind} from "@aldea/core/abi";

export class ValueLifter {
  private container: WasmContainer;

  constructor (container: WasmContainer) {
    this.container = container
  }

  lift (ptr: WasmWord, ty: AbiType): Uint8Array {
    const writer = new BufWriter()
    this.liftInto(ptr, ty, writer);
    return writer.data
  }

  liftInto (ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    switch (ty.name) {
      case 'bool':
        writer.writeU8(ptr.toInt() === 0 ? 0 : 1)
        break
      case 'u8':
        writer.writeU8(ptr.toInt())
        break
      case 'u16':
        writer.writeU16(ptr.toInt())
        break
      case 'u32':
      case 'usize':
        writer.writeU32(ptr.toInt())
        break
      case 'u64':
        writer.writeU64(ptr.toBigInt())
        break
      case 'i8':
        writer.writeI8(ptr.toInt())
        break
      case 'i16':
        writer.writeI16(ptr.toInt())
        break
      case 'i32':
      case 'isize':
        writer.writeI32(ptr.toInt())
        break
      case 'i64':
        writer.writeI64(ptr.toBigInt())
        break
      case 'f32':
        writer.writeF32(ptr.toInt())
        break
      case 'f64':
        writer.writeF64(ptr.toFloat())
        break
      case 'Array':
        this.liftArray(ptr, ty, writer)
        break
      case 'StaticArray':
        this.liftStaticArray(ptr, ty, writer)
        break
      case 'ArrayBuffer':
        this.liftArrayBuffer(ptr, writer)
        break
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
        this.liftTypedArray(ptr, writer)
        break
      case 'string':
        this.liftString(ptr, writer)
        break
      case 'Map':
        this.liftMap(ptr, ty, writer)
        break
      case 'Set':
        this.liftSet(ptr, ty, writer)
        break
      default:
        this.liftCompoundType(ptr, ty, writer)
        break
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
    // const reader = new BufReader(this.liftBuffer(dataPtr))
    let offset = dataPtr
    for (let i = 0; i < arrLength; i++) {
      const elemPtr = new WasmWord(this.container.mem.extract(offset, innerType.ownSize()))
      this.liftInto(elemPtr, innerType, writer)
      offset = offset.plus(innerType.ownSize())
    }
  }

  private liftStaticArray (ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    const byteLength = this.container.mem.read(ptr.minus(4), 4).readU32()
    const bufReader = this.container.mem.read(ptr, byteLength)
    const innerType = ty.args[0]

    const arrayLength = byteLength / innerType.ownSize()
    writer.writeULEB(arrayLength)

    // let offset = dataPtr
    for (let i = 0; i < arrayLength; i++) {
      const elemPtr = WasmWord.fromReader(bufReader, innerType)
      this.liftInto(elemPtr, innerType, writer)
    }
  }

  private liftArrayBuffer (ptr: WasmWord, writer: BufWriter) {
    const buf = this.liftBuffer(ptr)
    writer.writeBytes(buf)
  }

  private liftTypedArray (ptr: WasmWord, writer: BufWriter) {
    const header = this.container.mem.read(ptr, 12)
    const bufPtr = WasmWord.fromNumber(header.readU32())
    header.readU32()
    const bufLength = header.readU32()

    const buf = this.container.mem.extract(bufPtr, bufLength)
    writer.writeBytes(buf)
  }

  private liftString (ptr: WasmWord, writer: BufWriter) {
    const strLength = this.container.mem.read(ptr.minus(4), 4).readU32()
    const buf = Buffer.from(this.container.mem.extract(ptr, strLength))
    const string = buf.toString('utf16le')
    const stringBuf = Buffer.from(string)
    writer.writeBytes(stringBuf)
  }

  private liftCompoundType (ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    const maybeExported = this.container.abi.exportedByName(ty.name)
      .map(_ => this.liftExported(ptr, ty, writer))
    const maybeImported = this.container.abi.importedByName(ty.name)
      .map((_) => this.liftImported(ptr, ty, writer))

    maybeExported
      .or(maybeImported)
      .orElse(() => {
        throw new ExecutionError(`Unknown type: ${ty.name}`)
      })
  }

  private liftExported (ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    const exported = this.container.abi.exportedByName(ty.name).get()

    if (ty.name.startsWith('*')) {
      this.liftJig(ptr, writer, exported.toAbiClass())
    } else if (exported.kind === CodeKind.CLASS) {
      this.liftProxy(ptr, writer)
    } else if (exported.kind === CodeKind.OBJECT) {
      this.liftPlainObject(ptr, exported.toAbiObject(), writer)
    } else if (exported.kind === CodeKind.INTERFACE) {
      throw new Error('not implemented yet')
    } else if (exported.kind === CodeKind.FUNCTION) {
      throw new Error('Function cannot be lowered or lifted')
    } else {
      throw new Error(`Unknown export type: ${exported.kind}`)
    }
  }

  private liftJig (ptr: WasmWord, writer: BufWriter, cls: AbiClass) {
    cls.ownFields().forEach(field => {
      const fieldPtr = this.liftPtr(ptr.plus(field.offset), field.type)
      this.liftInto(fieldPtr, field.type, writer)
    })
  }

  private liftPlainObject (ptr: WasmWord, objDef: AbiPlainObject, writer: BufWriter) {
    objDef.fields.forEach(field => {
      const fieldPtr = this.liftPtr(ptr.plus(field.offset), field.type)
      this.liftInto(fieldPtr, field.type, writer)
    })
  }

  private liftImported (ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    const imported = this.container.abi.importedByName(ty.name).get()
    if (imported.kind === CodeKind.OBJECT) {
      this.liftPlainObject(ptr, imported.toAbiObject(), writer)
    } else if (imported.kind === CodeKind.PROXY_FUNCTION) {
      throw new Error('functions cannot be lowered or lifted')
    } else if ([CodeKind.PROXY_INTERFACE, CodeKind.PROXY_CLASS]) {
      this.liftProxy(ptr, writer)
    }
  }

  private liftProxy (ptr: WasmWord, writer: BufWriter) {
    const ptrOutput = this.liftPtr(ptr, AbiType.fromName('u32'))
    const originOutput = this.liftPtr(ptrOutput, AbiType.fromName('u32'))
    const buf = this.liftBuffer(originOutput)
    writer.writeFixedBytes(buf)
  }

  private liftMap (ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    const headerReader = this.container.mem.read(ptr.plus(8), 16);
    const entriesNum = headerReader.readU32()
    headerReader.readU32()
    headerReader.readU32()
    const entriesCount = headerReader.readU32();
    const entriesPtr = WasmWord.fromNumber(entriesNum)

    const keyTy = ty.args[0]
    const valueTy = ty.args[1]

    writer.writeULEB(entriesCount);

    let offset = entriesPtr
    for (let i = 0; i < entriesCount; i++) {
      offset = offset.align(keyTy.ownSize())
      const keyPtr = this.liftPtr(offset, ty)
      this.liftInto(keyPtr, keyTy, writer)
      offset = offset.plus(keyTy.ownSize()).align(valueTy.ownSize())
      const valuePtr = this.liftPtr(offset, valueTy)
      offset = offset.plus(valueTy.ownSize())
      this.liftInto(valuePtr, valueTy, writer)
      offset = offset.align(4).plus(4)
    }
  }

  private liftPtr (ptr: WasmWord, ty: AbiType): WasmWord {
    const reader = this.container.mem.read(ptr, ty.ownSize())
    return WasmWord.fromReader(reader, ty)
  }

  private liftSet (ptr: WasmWord, ty: AbiType, writer: BufWriter) {
    const headerReader = this.container.mem.read(ptr.plus(8), 16);
    const entriesNum = headerReader.readU32()
    headerReader.readU32()
    headerReader.readU32()
    const entriesCount = headerReader.readU32();
    const entriesPtr = WasmWord.fromNumber(entriesNum)

    const elemTy = ty.args[0]

    writer.writeULEB(entriesCount);

    let offset = entriesPtr
    for (let i = 0; i < entriesCount; i++) {
      offset = offset.align(elemTy.ownSize())
      const valuePtr = this.liftPtr(offset, elemTy)
      offset = offset.plus(elemTy.ownSize())
      this.liftInto(valuePtr, elemTy, writer)
      offset = offset.align(4).plus(4)
    }
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
