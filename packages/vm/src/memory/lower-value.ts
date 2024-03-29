import {WasmContainer} from "../wasm-container.js";
import {WasmWord} from "../wasm-word.js";
import {base16, BufReader, BufWriter, Pointer} from "@aldea/core";
import {AbiType} from "./abi-helpers/abi-type.js";
import {ARR_HEADER_LENGTH, BUF_RTID, STRING_RTID, TYPED_ARR_HEADER_LENGTH} from "./well-known-abi-nodes.js";
import {CodeKind, normalizeTypeName} from "@aldea/core/abi";
import {Option} from "../support/option.js";
import {ExecutionError} from "../errors.js";
import {Lock} from '../locks/lock.js'
import {AbiPlainObject} from "./abi-helpers/abi-plain-object.js";
import {AbiClass} from "./abi-helpers/abi-class.js";
import {ProxyDef} from "./abi-helpers/proxy-def.js";
import {blake3} from "@noble/hashes/blake3";
import {bytesToHex as toHex} from "@noble/hashes/utils";
import {bigIntToDigits} from "./bigint-buf.js";
import {bytesToBn} from "@aldea/core/support/util";

export type JigData = {
  origin: Pointer,
  location: Pointer,
  classPtr: Pointer,
  lock: Lock
}

type GetJigData = (p: Pointer) => Option<JigData>;

export class LowerValue {
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

  lowerFromReader(reader: BufReader, ty: AbiType) {
    if (ty.nullable) {
      return this.lowerOptional(reader, ty)
    }

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
      case 'BigInt':
        return this.lowerBigInt(reader, ty)

      case 'string':
        return this.lowerString(reader)
      case 'Map':
        return this.lowerMap(reader, ty)
      case 'Set':
        return this.lowerSet(reader, ty)
      default:
        return this.lowerCompoundType(reader, ty)
    }
  }

  private lowerBigInt(reader: BufReader, ty: AbiType): WasmWord {
    const isNeg = reader.readBool()
    const bytes = reader.readBytes()
    const abs = bytesToBn(bytes)
    const val = isNeg ? abs * -1n : abs
    const { d: d32Array, n } = bigIntToDigits(val)
    const dWriter = new BufWriter()
    dWriter.writeBytes(new Uint8Array(d32Array.buffer))
    const encodedD = dWriter.data

    const rtid = this.container.abi.rtIdByName('BigInt').expect(new ExecutionError("Expected BigInt in abi but not present"))
    const header = this.container.malloc(9, rtid.id)

    const dPtr = this.lower(encodedD, AbiType.fromName("Uint32Array"))

    this.container.mem.write(header, dPtr.serialize(AbiType.u32()))
    this.container.mem.write(header.plus(4), WasmWord.fromNumber(n).serialize(AbiType.u32()))
    this.container.mem.write(header.plus(8), new Uint8Array([Number(isNeg)]))

    return header
  }

  private lowerOptional(reader: BufReader, ty: AbiType): WasmWord {
    let isPresent = reader.readU8()
    if (isPresent) {
      return this.lowerFromReader(reader, ty.toPresent())
    } else {
      return WasmWord.null()
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
    headerWriter.writeU32(bufPtr.toInt())
    headerWriter.writeU32(bufPtr.toInt())
    headerWriter.writeU32(bufSize)
    headerWriter.writeU32(length)
    this.container.mem.write(headerPtr, headerWriter.data)

    let offset = bufPtr
    for (let time = 0; time < length; time++) {
      const elemPtr = this.lowerFromReader(reader, elemType)
      let elemBuf = elemPtr.serialize(elemType)
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
      let elemBuf = elemPtr.serialize(elemType)
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
    header.writeU32(bufPtr.toInt())
    header.writeU32(bufPtr.toInt())
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
    } else
    if (exported.kind === CodeKind.CLASS) {
      return this.lowerProxy(reader, exported.toAbiClass().toProxyDef())
    } else {
      throw this.lowerProxy(reader, exported.toAbiClass().toProxyDef())
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
      const data = lowered.serialize(field.type)
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
      return this.lowerProxy(reader, imported.toAbiProxy().toProxyDef())
    }
  }

  private lowerProxy(reader: BufReader, proxyDef: ProxyDef): WasmWord {
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
    const coreLock = jigData.lock.coreLock();
    buf.writeU32(coreLock.type)
    buf.writeBytes(coreLock.data)

    return buf.data
  }

  private lowerBuffer (buf: Uint8Array) {
    const ptr = this.container.malloc(buf.byteLength, BUF_RTID)
    this.container.mem.write(ptr, buf)
    return ptr
  }
  private lowerMap (reader: BufReader, ty: AbiType): WasmWord {
    const keyType = ty.args[0]
    const valueType = ty.args[1]

    const rtid = this.container.abi.rtidFromTypeNode(ty).get()

    const mapPtr = this.container.malloc(24, rtid.id)

    const mapBody = new BufWriter({size: 24})
    const initialCapacity = 4;
    const usizeSize = 4;

    const entrySize = WasmWord.fromNumber(0)
      .align(keyType.ownSize()).plus(keyType.ownSize())
      .align(valueType.ownSize()).plus(valueType.ownSize())
      .align(4).plus(4).toInt()

    const bucketsPtr = this.lowerBuffer(new Uint8Array(initialCapacity * usizeSize))
    const entriesPtr = this.lowerBuffer(new Uint8Array(initialCapacity * Number(entrySize)))

    mapBody.writeU32(bucketsPtr.toInt())
    mapBody.writeU32(initialCapacity - 1)
    mapBody.writeU32(entriesPtr.toInt())
    mapBody.writeU32(initialCapacity)
    mapBody.writeU32(0)
    mapBody.writeU32(0)
    this.container.mem.write(mapPtr, mapBody.data)


    const size = reader.readULEB()
    const typeHash = blake3(ty.normalizedName(), { dkLen: 4 })
    const fnName = `__put_map_entry_${ toHex(typeHash) }`
    for (let i = 0; i < size; i++) {
      const keyPtr = this.lowerFromReader(reader, keyType)
      const valuePtr = this.lowerFromReader(reader, valueType)
      this.container.callFn(fnName, [mapPtr, keyPtr, valuePtr], [ty, keyType, valueType])
    }

    return mapPtr;
  }

  private lowerSet(reader: BufReader, ty: AbiType): WasmWord {
    const rtId = this.container.abi.rtidFromTypeNode(ty).get()
    const innerType = ty.args[0]

    const setPtr = this.container.malloc(24, rtId.id)

    const setHeader = new BufWriter({size: 24})

    const initialCapacity = 4;
    const usizeSize = 4;

    const entrySize = WasmWord.fromNumber(0)
      .align(innerType.ownSize()).plus(innerType.ownSize())
      .align(4).plus(4).toInt()

    const bucketsPtr = this.lowerBuffer(new Uint8Array(initialCapacity * usizeSize))
    const entriesPtr = this.lowerBuffer(new Uint8Array(initialCapacity * Number(entrySize)))

    setHeader.writeU32(bucketsPtr.toInt())
    setHeader.writeU32(initialCapacity - 1)
    setHeader.writeU32(entriesPtr.toInt())
    setHeader.writeU32(initialCapacity)
    setHeader.writeU32(0)
    setHeader.writeU32(0)
    this.container.mem.write(setPtr, setHeader.data)

    const size = reader.readULEB()
    const typeHash = blake3(normalizeTypeName(ty), { dkLen: 4 })
    const fnName = `__put_set_entry_${ toHex(typeHash) }`
    for (let i = 0; i < size; i++) {
      const elemPtr = this.lowerFromReader(reader, innerType)
      this.container.callFn(fnName, [setPtr, elemPtr], [ty, innerType])
    }

    return setPtr
  }
}
