import {AbiVisitor} from "./abi-visitor.js";
import {AbiTraveler} from "./abi-traveler.js";
import {ClassNode, normalizeTypeName, ObjectNode, TypeNode} from "@aldea/compiler/abi";
import {WasmInstance as Module, WasmInstance} from "../wasm-instance.js";
import {getElementBytes, getObjectMemLayout, getTypeBytes, getTypedArrayConstructor, lowerBuffer} from "../memory.js";
import {WasmPointer} from "../arg-reader.js";
import {blake3} from "@noble/hashes/blake3";
import {bytesToHex as toHex} from "@noble/hashes/utils";

function hasTypedArrayConstructor(type: TypeNode): boolean {
  return [
    'f32', 'f64',
    'i8', 'i16', 'i32', 'i64',
    'u8', 'u16', 'u32', 'u64',
  ].includes(type.name)
}

export class LowerValueVisitor implements AbiVisitor<WasmPointer> {
  instance: WasmInstance
  value: any

  constructor(inst: WasmInstance, value: any) {
    this.instance = inst
    this.value = value
  }

  visitExportedClass (classNode: ClassNode, type: TypeNode, traveler: AbiTraveler): WasmPointer {
    return this.value.ref.ptr
  }

  visitArray(innerType: TypeNode, traveler: AbiTraveler): WasmPointer {
    const mod = this.instance
    const val = this.value as Array<any>
    const rtid = mod.abi.typeIds[normalizeTypeName({ name: 'Array', args: [innerType] })]
    const elBytes = getTypeBytes(innerType)
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
    const TypedArray = getTypedArrayConstructor(innerType)

    const length = val.length
    const buffer = mod.__pin(mod.__new((length << align), 0))
    const header = mod.__new(16, rtid)
    const memU32 = new Uint32Array(mod.memory.buffer)
    memU32[header >>> 2] = buffer;
    memU32[header + 4 >>> 2] = buffer;
    memU32[header + 8 >>> 2] = length << align;
    memU32[header + 12 >>> 2] = length;

    for (let i = 0; i < length; ++i) {
      const nextPos = buffer + ((i << align))
      new TypedArray(mod.memory.buffer)[nextPos >>> align] = this.lowerValue(val[i], innerType, traveler)
    }
    mod.__unpin(buffer)
    mod.__unpin(header)
    return header
  }

  visitStaticArray(innerType: TypeNode, traveler: AbiTraveler): WasmPointer {
    const mod = this.instance
    const val = this.value

    const rtid = mod.abi.typeIds[normalizeTypeName({name: 'StaticArray', args: [innerType]})]
    const elBytes = getTypeBytes(innerType)
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
    const TypedArray = getTypedArrayConstructor(innerType)

    const length = val.length
    const size = val.length << align;
    const buffer = mod.__pin(mod.__new(size, rtid))

    if (hasTypedArrayConstructor(innerType)) {
      new TypedArray(mod.memory.buffer, buffer, length).set(val)
    } else {
      for (let i = 0; i < length; i++) {
        const nextPos = buffer + ((i << align) >>> 0)
        const innerVisitor = new LowerValueVisitor(this.instance, val[i])
        traveler.acceptForType(innerType, innerVisitor)
        new TypedArray(mod.memory.buffer)[nextPos >>> align] = this.lowerValue(val[i], innerType, traveler)
      }
    }

    mod.__unpin(buffer);
    return buffer;
  }

  lowerValue (value: any, type: TypeNode, traveler: AbiTraveler): WasmPointer {
    const childVisitor = new LowerValueVisitor(this.instance, value)
    return traveler.acceptForType(type, childVisitor)
  }

  visitIBigNumberValue(): WasmPointer {
    return BigInt.asIntN(64, BigInt(this.value))
  }

  visitUBigNumberValue(): WasmPointer {
    return BigInt.asUintN(64, BigInt(this.value))
  }

  visitBoolean(): WasmPointer {
    return this.value ? 1 : 0
  }

  visitImportedClass(node: TypeNode, pkgId: string): WasmPointer {
    const val = this.value
    const mod = this.instance
    const buf = Buffer.from(val.originBuf);
    const bufferPtr = lowerBuffer(mod, buf)
    const ptr = mod.__new(val.originBuf.byteLength, mod.abi.typeIds[val.className()]);
    const memU32 = new Uint32Array(mod.memory.buffer)
    memU32[ptr >>> 2] = bufferPtr
    return ptr
  }

  visitMap(keyType: TypeNode, valueType: TypeNode, traveler: AbiTraveler): WasmPointer {
    const mod = this.instance
    const val = this.value as Map<any, any>
    const type = { name: 'Map', args: [keyType, valueType] };

    const kBytes = getTypeBytes(keyType)
    const vBytes = getTypeBytes(valueType)

    const krBytes = Math.max(kBytes, vBytes)
    const trBytes = Math.max(vBytes, 4)
    const vrBytes = kBytes === 8 && kBytes > vBytes ? trBytes : Math.max(kBytes, vBytes)
    const entrySize = Math.max(krBytes + vrBytes, 4) + trBytes
    const ptr = this.lowerEmptySetOrMap(mod, type, entrySize)

    const typeHash = blake3(normalizeTypeName(type), { dkLen: 4 })
    const fnName = `__put_map_entry_${ toHex(typeHash) }`
    val.forEach((v, k) => {
      const keyPtr = this.lowerValue(k, keyType, traveler)
      const valuePtr = this.lowerValue(v, valueType, traveler)
      mod.exports[fnName](ptr, Number(keyPtr), Number(valuePtr))
    })

    return ptr
  }

  visitPlainObject(objNode: ObjectNode, typeNode: TypeNode, traveler: AbiTraveler): WasmPointer {
    let vals = this.value
    const mod = this.instance
    if (!Array.isArray(vals)) { vals = Object.values(vals) }
    if (!Array.isArray(vals) || objNode.fields.length !== vals.length) {
      throw new Error(`invalid state for ${objNode.name}`)
    }

    const rtid = mod.abi.typeIds[objNode.name]
    const bytes = objNode.fields.reduce((sum, n) => sum + getTypeBytes(n.type), 0)
    const ptr = mod.__new(bytes, rtid) >>> 0
    const offsets = getObjectMemLayout(objNode)

    objNode.fields.forEach((n, i) => {
      const TypedArray = getTypedArrayConstructor(n.type)
      const mem = new TypedArray(mod.memory.buffer, ptr, bytes)
      const { align, offset } = offsets[n.name]
      mem[offset >>> align] = this.lowerValue(vals[i], n.type, traveler)
    })
    return ptr
  }

  visitSet(innerType: TypeNode, traveler: AbiTraveler): WasmPointer {
    const mod = this.instance
    const val = this.value as Set<any>
    const type = { name: 'Set', args: [innerType] }
    const bytes = Math.max(getTypeBytes(innerType), 4)
    const entrySize = bytes + Math.max(bytes, 4)
    const ptr = this.lowerEmptySetOrMap(mod, type, entrySize)

    const typeHash = blake3(normalizeTypeName(type), { dkLen: 4 })
    const fnName = `__put_set_entry_${ toHex(typeHash) }`
    val.forEach(v => {
      mod.exports[fnName](ptr, Number(this.lowerValue(v, innerType, traveler)))
    })

    return ptr
  }

  visitSmallNumberValue(typeName: string): WasmPointer {
    return Number(this.value)
  }

  visitString(): WasmPointer {
    const mod = this.instance
    const val = this.value as string
    const ptr = mod.__new(val.length << 1, 1)
    const memU16 = new Uint16Array(mod.memory.buffer);
    for (let i = 0; i < val.length; ++i) {
      memU16[(ptr >>> 1) + i] = val.charCodeAt(i)
    }
    return ptr
  }

  visitTypedArray(typeName: string, param2: AbiTraveler): WasmPointer {
    const mod = this.instance
    const val = this.value
    const type = {name: typeName, args: []};

    const rtid = mod.abi.typeIds[normalizeTypeName(type)]
    const elBytes = getElementBytes(type)
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0

    const length = val.length
    const buffer = mod.__pin(mod.__new((length << align), 0)) >>> 0
    const header = mod.__new(12, rtid) >>> 0
    const memU32 = new Uint32Array(mod.memory.buffer)
    memU32[header >>> 2] = buffer
    memU32[header + 4 >>> 2] = buffer
    memU32[header + 8 >>> 2] = length << align
    const TypedArray = getTypedArrayConstructor(type)
    new TypedArray(mod.memory.buffer, buffer, length).set(val)
    mod.__unpin(buffer)
    return header;
  }

  visitArrayBuffer(): WasmPointer {
    const mod = this.instance
    const val = this.value
    const ptr = mod.__new(val.byteLength, 0) >>> 0;
    new Uint8Array(mod.memory.buffer).set(new Uint8Array(val), ptr);
    return ptr;
  }


  private lowerEmptySetOrMap(mod: Module, type: TypeNode, entrySize: number): number {
    const rtid = mod.abi.typeIds[normalizeTypeName(type)]
    const initCapacity = 4
    const buckets = mod.__new(initCapacity * 4, 0)
    const entries = mod.__new(initCapacity * entrySize, 0)
    const ptr = mod.__new(24, rtid)

    const memU32 = new Uint32Array(mod.memory.buffer)
    memU32[ptr >>> 2] = buckets
    memU32[ptr + 1 >>> 2] = initCapacity - 1
    memU32[ptr + 2 >>> 2] = entries
    memU32[ptr + 3 >>> 2] = initCapacity
    memU32[ptr + 4 >>> 2] = 0
    memU32[ptr + 5 >>> 2] = 0

    return ptr
  }

  visitVoid(): WasmPointer {
    return 0
  }
}
