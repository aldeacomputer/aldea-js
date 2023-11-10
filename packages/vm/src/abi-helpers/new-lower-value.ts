import {WasmContainer} from "../wasm-container.js";
import {WasmWord} from "../wasm-word.js";
import {BufReader, BufWriter, Pointer} from "@aldea/core";
import {AbiType} from "./abi-helpers/abi-type.js";
import {
  ARR_HEADER_LENGTH,
  BUF_RTID,
  LOCK_OBJ_LENGTH,
  OUTPUT_OBJ_LENGTH,
  PROXY_OBJ_LENGTH,
  STRING_RTID,
  TYPED_ARR_HEADER_LENGTH
} from "./well-known-abi-nodes.js";
import {CodeKind} from "@aldea/core/abi";
import {Option} from "../support/option.js";
import {ExecutionError} from "../errors.js";
import {Lock} from '../locks/lock.js'
import {AbiPlainObject} from "./abi-helpers/abi-plain-object.js";
import {AbiClass} from "./abi-helpers/abi-class.js";
import {AbiImport} from "./abi-helpers/abi-import.js";
import {AbiProxyDef} from "./abi-helpers/abi-proxy-def.js";

export type JigData = {
  origin: Pointer,
  location: Pointer,
  classPtr: Pointer,
  outputHash: Uint8Array
  lock: Lock
}

type GetJigData = (p: Pointer) => Option<JigData>;

export class NewLowerValue {
  private container: WasmContainer;
  private getJigData: GetJigData

  constructor (container: WasmContainer, getJigData: GetJigData) {
    this.container = container
    this.getJigData = getJigData
  }

  lower(encoded: Uint8Array, ty: AbiType): WasmWord {
    const reader = new BufReader(encoded)
    return this.lowerFromReader(reader, ty)
  }

  private lowerFromReader(reader: BufReader, ty: AbiType) {
    switch (ty.name) {
      case 'bool':
        return WasmWord.fromNumber(reader.readU8())
      case 'u8':
        return WasmWord.fromNumber(reader.readU8())
      case 'u16':
        return WasmWord.fromNumber(reader.readU16())
      case 'usize':
      case 'u32':
        return WasmWord.fromNumber(reader.readU32())
      case 'u64':
        return WasmWord.fromBigInt(reader.readU64())
      case 'i8':
        return WasmWord.fromNumber(reader.readI8())
      case 'i16':
        return WasmWord.fromNumber(reader.readI16())
      case 'isize':
      case 'i32':
        return WasmWord.fromNumber(reader.readI32())
      case 'i64':
        return WasmWord.fromBigInt(reader.readI64())
      case 'f32':
        return WasmWord.fromNumber(reader.readF32())
      case 'f64':
        return WasmWord.fromNumber(reader.readF64())
      case 'Array':
        return this.lowerArray(reader, ty)
      case 'StaticArray':
        return this.lowerStaticArray(reader, ty)
      case 'ArrayBuffer':
        return this.lowerArrayBuffer(reader)
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
        return this.lowerTypedArray(reader, ty)
      case 'string':
        return this.lowerString(reader)
      default:
        return this.lowerCompoundType(reader, ty)
    }
  }

  private lowerArray(reader: BufReader, ty: AbiType): WasmWord {
    const rtId = this.container.abi.rtidFromTypeNode(ty).get()
    const length = reader.readULEB()
    const elemType = ty.args[0]
    const bufSize = length * elemType.ownSize()

    const headerPtr = this.container.malloc(ARR_HEADER_LENGTH, rtId.id)
    const bufPtr = this.container.malloc(bufSize, BUF_RTID)

    const headerWriter = new BufWriter()
    headerWriter.writeU32(bufPtr.toNumber())
    headerWriter.writeU32(bufPtr.toNumber())
    headerWriter.writeU32(bufSize)
    headerWriter.writeU32(length)
    this.container.mem.write(headerPtr, headerWriter.data)

    let offset = bufPtr
    for (let time = 0; time < length; time++) {
      const elemPtr = this.lowerFromReader(reader, elemType)
      let elemBuf = this.serializeWord(elemPtr, elemType)
      offset = offset.align(elemType.ownSize())
      this.container.mem.write(offset, elemBuf)
      offset = offset.plus(elemType.ownSize())
    }

    return headerPtr
  }
  private lowerStaticArray(reader: BufReader, ty: AbiType): WasmWord {
    const rtId = this.container.abi.rtidFromTypeNode(ty).get()
    const length = reader.readULEB()
    const elemType = ty.args[0]
    const bufSize = length * elemType.ownSize()

    const arrPtr = this.container.malloc(bufSize, rtId.id)

    let offset = arrPtr
    for (let pos = 0; pos < length; pos++) {
      const elemPtr = this.lowerFromReader(reader, elemType)
      let elemBuf = this.serializeWord(elemPtr, elemType)
      offset = offset.align(elemType.ownSize())
      this.container.mem.write(offset, elemBuf)
      offset = offset.plus(elemType.ownSize())
    }

    return arrPtr
  }

  private lowerArrayBuffer (reader: BufReader): WasmWord {
    const buf = reader.readBytes()
    return this.lowerBuffer(buf)
  }

  private lowerTypedArray(reader: BufReader, ty: AbiType): WasmWord {
    const buf = reader.readBytes()

    const rtId = this.container.abi.rtidFromTypeNode(ty).get()
    const headerPtr = this.container.malloc(TYPED_ARR_HEADER_LENGTH, rtId.id)
    const bufPtr = this.container.malloc(buf.byteLength, BUF_RTID)

    let header = new BufWriter({ size: TYPED_ARR_HEADER_LENGTH })
    header.writeU32(bufPtr.toNumber())
    header.writeU32(bufPtr.toNumber())
    header.writeU32(buf.byteLength)
    this.container.mem.write(headerPtr, header.data)
    this.container.mem.write(bufPtr, buf)

    return headerPtr
  }

  private lowerString(reader: BufReader): WasmWord {
    const buf = reader.readBytes()
    const string = Buffer.from(buf).toString('utf8')
    const utf16Buf = Buffer.from(string, 'utf16le')

    const ptr = this.container.malloc(utf16Buf.byteLength, STRING_RTID)
    this.container.mem.write(ptr, utf16Buf)
    return ptr
  }

  private lowerCompoundType(reader: BufReader, ty: AbiType): WasmWord {
    const exported = this.container.abi.exportedByName(ty.name)
    const imported = this.container.abi.importedByName(ty.name)
    return exported
      .map(_e => this.lowerExported(reader, ty))
      .or(imported.map(_i => this.lowerImported(reader, ty) ))
      .orElse(() => { throw new Error(`unknown type: ${ty.name}`)})
  }

  private lowerExported(reader: BufReader, ty: AbiType): WasmWord {
    const exported =  this.container.abi.exportedByName(ty.name).get()
    if (exported.kind === CodeKind.OBJECT) {
      const plainObj = exported.toAbiObject()
      return this.lowerPlainObject(reader, plainObj)
    } else
    if (ty.name.startsWith('*')) {
      return this.lowerJig(reader, exported.toAbiClass())
    } else {
      throw new Error('not implemented')
    }
  }

  private lowerJig(reader: BufReader, cls: AbiClass): WasmWord {
    const rtId = this.container.abi.rtIdByName(cls.typeName).get()
    const jigPtr = this.container.malloc(cls.ownSize(), rtId.id)

    cls.fields.forEach(field => {
      const fieldPtr = this.lowerFromReader(reader, field.type)
      this.container.mem.write(jigPtr.plus(field.offset), fieldPtr.serialize(field.type))
    })

    if (reader.remaining !== 0) {
      throw new Error('Lower a jig should consume entire buffer')
    }

    return jigPtr
  }

  private lowerPlainObject(reader: BufReader, objDef: AbiPlainObject): WasmWord {
    const rtId = this.container.abi.rtIdByName(objDef.name).get()

    const objPtr = this.container.malloc(objDef.ownSize(), rtId.id)

    for (const field of objDef.fields) {
      const offset = objPtr.plus(field.offset)
      const lowered = this.lowerFromReader(reader, field.type)
      const data = this.serializeWord(lowered, field.type)
      this.container.mem.write(offset, data)
    }

    return objPtr
  }

  private lowerImported(reader: BufReader, ty: AbiType): WasmWord {
    const imported = this.container.abi.importedByName(ty.name).get()

    if (imported.kind === CodeKind.OBJECT) {
      const plainObj = imported.toAbiObject()
      return this.lowerPlainObject(reader, plainObj)
    } else {
      return this.lowerProxy(reader, imported.toAbiProxy())
    }

    // const origin = Pointer.fromBytes(reader.readFixedBytes(34))
    // const data = this.getJigData(origin).expect(new ExecutionError(`Missing referenced output: ${origin.toString()}`))
    //
    // const objRtid = this.container.abi.rtidFromTypeNode(ty).get()
    // const outoputRtid = this.container.abi.outputRtid()
    // const lockRtid = this.container.abi.lockRtid()
    //
    //
    // const objPtr = this.container.malloc(PROXY_OBJ_LENGTH, objRtid.id)
    // const outputPtr = this.container.malloc(OUTPUT_OBJ_LENGTH, outoputRtid.id)
    // const lockPtr = this.container.malloc(LOCK_OBJ_LENGTH, lockRtid.id)
    //
    // const originPtr = this.lowerBuffer(data.origin.toBytes())
    // const locationPtr = this.lowerBuffer(data.location.toBytes())
    // const classPtr = this.lowerBuffer(data.classPtr.toBytes())
    // const lockDataPtr = this.lowerBuffer(data.lock.data())
    //
    // const outputContent = new BufWriter({size: 12})
    // outputContent.writeU32(originPtr.toNumber())
    // outputContent.writeU32(locationPtr.toNumber())
    // outputContent.writeU32(classPtr.toNumber())
    // this.container.mem.write(outputPtr, outputContent.data)
    //
    // const lockContent = new BufWriter({size: 12})
    // lockContent.writeU32(originPtr.toNumber())
    // lockContent.writeU32(data.lock.typeNumber())
    // lockContent.writeI32(lockDataPtr.toNumber())
    // this.container.mem.write(lockPtr, lockContent.data)
    //
    // const objData = new BufWriter({ size: 8 })
    // objData.writeU32(outputPtr.toNumber())
    // objData.writeU32(lockPtr.toNumber())
    // this.container.mem.write(objPtr, objData.data)

    // return
  }

  private lowerProxy(reader: BufReader, proxyDef: AbiProxyDef): WasmWord {
    const origin = Pointer.fromBytes(reader.readFixedBytes(34))

    const jigData = this.getJigData(origin)
      .expect(new ExecutionError(`Missing referenced output: ${origin.toString()}`))

    const dataBuf = this.serializeJigData(jigData)
    const dataReader = new BufReader(dataBuf)

    const rtId = this.container
      .abi.rtIdByName(proxyDef.name).get()

    const proxyPtr = this.container.malloc(proxyDef.ownSize(), rtId.id)

    for (const field of proxyDef.fields) {
      const fieldPtr = this.lowerFromReader(dataReader, field.type)
      this.container.mem.write(proxyPtr.plus(field.offset), fieldPtr.serialize(field.type))
    }

    return proxyPtr
  }

  private serializeJigData (jigData: JigData): Uint8Array {
    const buf = new BufWriter()
    // Write output
    buf.writeBytes(jigData.origin.toBytes())
    buf.writeBytes(jigData.location.toBytes())
    buf.writeBytes(jigData.classPtr.toBytes())

    // Write lock
    buf.writeBytes(jigData.origin.toBytes())
    buf.writeU32(jigData.lock.typeNumber())
    buf.writeBytes(jigData.lock.data())

    return buf.data
  }

  private lowerBuffer (buf: Uint8Array) {
    const ptr = this.container.malloc(buf.byteLength, BUF_RTID)
    this.container.mem.write(ptr, buf)
    return ptr
  }

  private serializeWord(word: WasmWord, ty: AbiType): Uint8Array {
    return word.serialize(ty)
  }

}
