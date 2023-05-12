import {base16} from "@aldea/core";
import {ClassNode, FieldNode, InterfaceNode, normalizeTypeName, ObjectNode, TypeNode} from "@aldea/core/abi";
import {AbiTraveler} from "./abi-traveler.js";
import {WasmInstance as Module, WasmInstance} from "../wasm-instance.js";
import {getElementBytes, getObjectMemLayout, getTypeBytes, getTypedArrayConstructor} from "../memory.js";
import {WasmPointer} from "../arg-reader.js";
import {blake3} from "@noble/hashes/blake3";
import {bytesToHex as toHex} from "@noble/hashes/utils";
import {JigRef} from "../jig-ref.js";
import {emptyTn, outputAbiNode} from "./well-known-abi-nodes.js";
import {AbiAccess} from "./abi-access.js";

const STRING_RTID = 1;
const BUFFER_RTID = 0;

function hasTypedArrayConstructor(type: TypeNode): boolean {
  return [
    'f32', 'f64',
    'i8', 'i16', 'i32', 'i64',
    'u8', 'u16', 'u32', 'u64',
  ].includes(type.name)
}

export class LowerValueVisitor extends AbiTraveler<WasmPointer> {
  instance: WasmInstance
  value: any

  constructor(abi: AbiAccess,inst: WasmInstance, value: any) {
    super(abi)
    this.instance = inst
    this.value = value
  }

  private lowerJigProxy (type: TypeNode) {
    const val = this.value as JigRef
    const mod = this.instance
    // const buf = Buffer.from(val.originBuf);
    // const bufferPtr = lowerBuffer(mod, buf)

    const outputPtr = this.lowerValue(val.outputObject(), emptyTn(outputAbiNode.name))
    const lockPtr = this.lowerValue(val.lockObject(), emptyTn('Lock'))

    // this.lowerValue()
    const objPtr = mod.__new(8, mod.abi.rtidFromTypeNode(type));
    const memU32 = new Uint32Array(mod.memory.buffer)
    memU32[objPtr >>> 2] = Number(outputPtr)
    memU32[(objPtr + 4) >>> 2] = Number(lockPtr)
    return objPtr
  }

  visitExportedClass (classNode: ClassNode, type: TypeNode): WasmPointer {
    return this.lowerJigProxy(type)
  }

  visitArray(innerType: TypeNode): WasmPointer {
    const mod = this.instance
    const val = this.value as Array<any>
    const rtid = mod.abi.rtidFromTypeNode({ name: 'Array', args: [innerType], nullable: false })
    const elBytes = getTypeBytes(innerType)
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
    const TypedArray = getTypedArrayConstructor(innerType)

    const length = val.length
    const buffer = mod.__pin(mod.__new((length << align), BUFFER_RTID))
    const header = mod.__new(16, rtid)
    const memU32 = new Uint32Array(mod.memory.buffer)
    memU32[header >>> 2] = buffer;
    memU32[header + 4 >>> 2] = buffer;
    memU32[header + 8 >>> 2] = length << align;
    memU32[header + 12 >>> 2] = length;

    for (let i = 0; i < length; ++i) {
      const nextPos = buffer + ((i << align))
      new TypedArray(mod.memory.buffer)[nextPos >>> align] = this.lowerValue(val[i], innerType)
    }
    mod.__unpin(buffer)
    mod.__unpin(header)
    return header
  }

  visitStaticArray(innerType: TypeNode): WasmPointer {
    const mod = this.instance
    const val = this.value

    const rtid = mod.abi.rtidFromTypeNode({name: 'StaticArray', args: [innerType], nullable: false})
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
        new TypedArray(mod.memory.buffer)[nextPos >>> align] = this.lowerValue(val[i], innerType)
      }
    }

    mod.__unpin(buffer);
    return buffer;
  }

  lowerValue (value: any, type: TypeNode): WasmPointer {
    const childVisitor = new LowerValueVisitor(this.abi, this.instance, value)
    return childVisitor.travelFromType(type)
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

  visitImportedClass(type: TypeNode, _pkgId: string): WasmPointer {
    return this.lowerJigProxy(type)
    // const val = this.value as JigRef
    // const mod = this.instance
    // // const buf = Buffer.from(val.originBuf);
    // // const bufferPtr = lowerBuffer(mod, buf)
    //
    // const outputPtr = this.lowerValue(val.outputObject(), { name: outputAbiNode.name, args: [] })
    // const lockPtr = this.lowerValue(val.lockObject(), { name: 'Lock', args: [] })
    //
    // // this.lowerValue()
    // const objPtr = mod.__new(8, mod.abi.rtidFromTypeNode(type));
    // const memU32 = new Uint32Array(mod.memory.buffer)
    // memU32[objPtr >>> 2] = Number(outputPtr)
    // memU32[(objPtr + 4) >>> 2] = Number(lockPtr)
    // return objPtr
  }

  visitMap(keyType: TypeNode, valueType: TypeNode): WasmPointer {
    const mod = this.instance
    const val = this.value as Map<any, any>
    const type = { name: 'Map', args: [keyType, valueType], nullable: false };

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
      const keyPtr = this.lowerValue(k, keyType)
      const valuePtr = this.lowerValue(v, valueType)
      mod.exports[fnName](ptr, keyPtr, valuePtr)
    })

    return ptr
  }

  visitPlainObject(objNode: ObjectNode, typeNode: TypeNode): WasmPointer {
    let value = this.value
    const mod = this.instance
    if (!Array.isArray(value)) { value = Object.values(value) }
    if (!Array.isArray(value) || objNode.fields.length !== value.length) {
      throw new Error(`invalid state for ${objNode.name}`)
    }

    const rtid = mod.abi.rtidFromTypeNode(typeNode)
    const bytes = objNode.fields.reduce((sum: number, n: FieldNode) => sum + getTypeBytes(n.type), 0)
    const ptr = mod.__new(bytes, rtid)
    const offsets = getObjectMemLayout(objNode)

    objNode.fields.forEach((n: FieldNode, i: number) => {
      const TypedArray = getTypedArrayConstructor(n.type)
      const mem = new TypedArray(mod.memory.buffer, ptr, bytes)
      const { align, offset } = offsets[n.name]
      mem[offset >>> align] = this.lowerValue(value[i], n.type)
    })
    return ptr
  }

  visitSet(innerType: TypeNode): WasmPointer {
    const mod = this.instance
    const val = this.value as Set<any>
    const type = { name: 'Set', args: [innerType], nullable: false }
    const bytes = Math.max(getTypeBytes(innerType), 4)
    const entrySize = bytes + Math.max(bytes, 4)
    const ptr = this.lowerEmptySetOrMap(mod, type, entrySize)

    const typeHash = blake3(normalizeTypeName(type), { dkLen: 4 })
    const fnName = `__put_set_entry_${ toHex(typeHash) }`
    val.forEach(v => {
      mod.exports[fnName](ptr, this.lowerValue(v, innerType))
    })

    return ptr
  }

  visitSmallNumberValue(typeName: string): WasmPointer {
    return Number(this.value)
  }

  visitString(): WasmPointer {
    const mod = this.instance
    const val = this.value as string
    const ptr = mod.__new(val.length << 1, STRING_RTID)
    const memU16 = new Uint16Array(mod.memory.buffer);
    for (let i = 0; i < val.length; ++i) {
      memU16[(ptr >>> 1) + i] = val.charCodeAt(i)
    }
    return ptr
  }

  visitTypedArray(typeName: string): WasmPointer {
    const mod = this.instance
    const val = this.value
    const type = emptyTn(typeName);

    const rtid = mod.abi.rtidFromTypeNode(type)
    const elBytes = getElementBytes(type)
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0

    const length = val.length
    const buffer = mod.__pin(mod.__new((length << align), BUFFER_RTID))
    const header = mod.__new(12, rtid)
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
    const ptr = mod.__new(val.byteLength, BUFFER_RTID);
    new Uint8Array(mod.memory.buffer).set(new Uint8Array(val), ptr);
    return ptr;
  }


  private lowerEmptySetOrMap(mod: Module, type: TypeNode, entrySize: number): number {
    const rtid = mod.abi.rtidFromTypeNode(type)
    const initCapacity = 4
    const buckets = mod.__new(initCapacity * 4, BUFFER_RTID)
    const entries = mod.__new(initCapacity * entrySize, BUFFER_RTID)
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

  visitInterface(anInterface: InterfaceNode, _typeNode: TypeNode): WasmPointer {
    const jig = this.value as JigRef
    const className = jig.className();
    const typeNode = emptyTn(className);
    if (jig.package === this.instance) {
      const classNode = this.abi.classByName(className)
      return this.visitExportedClass(classNode, typeNode)
    } else {
      return this.visitImportedClass(typeNode, base16.encode(jig.package.id))
    }
  }
}
