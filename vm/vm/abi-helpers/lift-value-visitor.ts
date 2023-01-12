import {AbiVisitor} from "./abi-visitor.js";
import {AbiTraveler} from "./abi-traveler.js";
import {ClassNode, FieldNode, normalizeTypeName, ObjectNode, TypeNode} from "@aldea/compiler/abi";
import {WasmInstance} from "../wasm-instance.js";
import {WasmPointer} from "../arg-reader.js";
import {Externref, getTypeBytes, getTypedArrayConstructor, Internref, liftBuffer} from "../memory.js";
import {getObjectMemLayout} from "../memory.js";


export class LiftValueVisitor implements AbiVisitor {
  instance: WasmInstance
  ptr: WasmPointer
  value: any

  constructor(inst: WasmInstance, ptr: WasmPointer) {
    this.instance = inst
    this.ptr = ptr
    this.value = null
  }

  visitExportedClass (node: ClassNode, traveler: AbiTraveler): void {
    this.value = new Internref(node.name, Number(this.ptr))
  }

  visitArray(innerType: TypeNode, traveler: AbiTraveler): void {
    const mod = this.instance
    const ptr = Number(this.ptr)
    const memU32 = new Uint32Array(mod.memory.buffer)
    const start = memU32[ptr + 4 >>> 2]
    const length = memU32[ptr + 12 >>> 2]
    const elBytes = getTypeBytes(innerType)
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
    const TypedArray = getTypedArrayConstructor(innerType)
    const values = new Array(length)

    for (let i = 0; i < length; i++) {
      const nextPos = start + ((i << align) >>> 0)
      const nextPtr = new TypedArray(mod.memory.buffer)[nextPos >>> align]
      const innerVisitor = new LiftValueVisitor(this.instance, nextPtr)
      traveler.acceptForType(innerType, innerVisitor)
      values[i] = innerVisitor.value
    }
    this.value = values
  }

  visitStaticArray(innerType: TypeNode, traveler: AbiTraveler): void {
    const mod = this.instance
    const ptr = Number(this.ptr)
    const memU32 = new Uint32Array(mod.memory.buffer)
    const start = ptr
    const length = memU32[ptr + 12 >>> 2]
    const elBytes = getTypeBytes(innerType)
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
    const TypedArray = getTypedArrayConstructor(innerType)
    const values = new Array(length)

    for (let i = 0; i < length; i++) {
      const nextPos = start + ((i << align) >>> 0)
      const nextPtr = new TypedArray(mod.memory.buffer)[nextPos >>> align]
      const innerVisitor = new LiftValueVisitor(this.instance, nextPtr)
      traveler.acceptForType(innerType, innerVisitor)
      values[i] = innerVisitor.value
    }
    this.value = values
  }

  visitIBigNumberValue(): void {
    this.value = BigInt.asUintN(64, this.ptr as bigint)
  }

  visitUBigNumberValue() {
    this.value = BigInt.asIntN(64, this.ptr as bigint)
  }

  visitBoolean(): void {
    this.value = !!this.ptr
  }

  visitImportedClass(node: TypeNode, pkgId: string): void {
    const mod = this.instance;
    const ptr = Number(this.ptr)
    const bufPtr = new Uint32Array(mod.memory.buffer)[ptr >>> 2]

    const origin = liftBuffer(this.instance, bufPtr)
    this.value = new Externref(normalizeTypeName(node), origin)
  }

  visitMap(keyType: TypeNode, valueType: TypeNode, traveler: AbiTraveler): void {
    const mod = this.instance
    const ptr = Number(this.ptr)
    const mem32 = new Uint32Array(mod.memory.buffer)
    const start = mem32[ptr + 8 >>> 2]
    const size  = mem32[ptr + 16 >>> 2]

    const keyTypeNode = keyType;
    const KeyTypedArray = getTypedArrayConstructor(keyTypeNode)
    const kBytes = getTypeBytes(keyTypeNode)
    const kAlign = kBytes > 1 ? Math.ceil(kBytes / 3) : 0
    const kEntries = new KeyTypedArray(liftBuffer(mod, start).buffer)

    const valueTypeNode = valueType;
    const ValTypedArray = getTypedArrayConstructor(valueTypeNode)
    const vBytes = getTypeBytes(valueTypeNode)
    const vAlign = vBytes > 1 ? Math.ceil(vBytes / 3) : 0
    const vEntries = new ValTypedArray(liftBuffer(mod, start).buffer)

    const krBytes = Math.max(kBytes, vBytes)
    const trBytes = Math.max(vBytes, 4)
    const vrBytes = kBytes === 8 && kBytes > vBytes ? trBytes : Math.max(kBytes, vBytes)
    const entrySize = Math.max(krBytes + vrBytes, 4) + trBytes

    const map = new Map()
    for (let i = 0; i < size; i++) {
      const keyPos = i * entrySize
      const valPos = keyPos + krBytes

      const keyPtr = kEntries[keyPos >>> kAlign]
      const keyVisitor = new LiftValueVisitor(this.instance, keyPtr)
      traveler.acceptForType(keyTypeNode, keyVisitor)
      const key = keyVisitor.value

      const valPtr = vEntries[valPos >>> vAlign]
      const valueVisitor = new LiftValueVisitor(this.instance, valPtr)
      traveler.acceptForType(valueTypeNode, valueVisitor)
      const val = valueVisitor.value

      map.set(key, val)
    }

    this.value = map
  }

  visitPlainObject(objNode: ObjectNode, _typeNode: TypeNode, traveler: AbiTraveler): void {
    const mod = this.instance
    const ptr = Number(this.ptr)
    const offsets = getObjectMemLayout(objNode)
    this.value = objNode.fields.reduce((obj: any, n: FieldNode, _i) => {
      const TypedArray = getTypedArrayConstructor(n.type)
      const { align, offset } = offsets[n.name]
      const nextPtr = new TypedArray(mod.memory.buffer)[ptr + offset >>> align]
      const innerVisitor = new LiftValueVisitor(this.instance, nextPtr)
      traveler.acceptForType(n.type, innerVisitor)
      obj[n.name] = innerVisitor.value
      return obj
    }, {})
  }

  visitSet(innerType: TypeNode, traveler: AbiTraveler): void {
    const mod = this.instance
    const ptr = Number(this.ptr)
    const mem32 = new Uint32Array(mod.memory.buffer)
    const start = mem32[ptr + 8 >>> 2]
    const size  = mem32[ptr + 16 >>> 2]

    const TypedArray = getTypedArrayConstructor(innerType)
    const vBytes = getTypeBytes(innerType)
    const vAlign = vBytes > 1 ? Math.ceil(vBytes / 3) : 0
    const vEntries = new TypedArray(liftBuffer(mod, start).buffer)

    const vrBytes = Math.max(vBytes, 4)
    const entrySize = vrBytes + Math.max(vrBytes, 4)

    const set = new Set()
    for (let i = 0; i < size; i++) {
      const valPos = i * entrySize
      const valPtr = vEntries[valPos >>> vAlign]
      const innerVisitor = new LiftValueVisitor(this.instance, valPtr)
      traveler.acceptForType(innerType, innerVisitor)
      const val = innerVisitor.value
      set.add(val)
    }
    this.value = set
  }

  visitSmallNumberValue(typeName: string): void {
    this.value = Number(this.ptr)
  }

  visitString(): void {
    const ptr = Number(this.ptr)
    const mod = this.instance
    const end = ptr + new Uint32Array(mod.memory.buffer)[ptr - 4 >>> 2] >>> 1
    const memU16 = new Uint16Array(mod.memory.buffer)
    let start = ptr >>> 1, string = "";
    while (end - start > 1024) {
      string += String.fromCharCode(...memU16.subarray(start, start += 1024))
    }
    this.value = string + String.fromCharCode(...memU16.subarray(start, end))
  }

  visitTypedArray(typeName: string, param2: AbiTraveler): void {
    const ptr = Number(this.ptr)
    const mod = this.instance
    const memU32 = new Uint32Array(mod.memory.buffer);
    const TypedArray = getTypedArrayConstructor({ name: typeName, args: [] })
    this.value = new TypedArray(
      mod.memory.buffer,
      memU32[ptr + 4 >>> 2],
      memU32[ptr + 8 >>> 2] / TypedArray.BYTES_PER_ELEMENT
    ).slice();
  }

  visitArrayBuffer(): void {
    const mod = this.instance
    const ptr = Number(this.ptr)
    this.value = new Uint8Array(
      mod.memory.buffer.slice(
        ptr,
        ptr + new Uint32Array(mod.memory.buffer)[ptr - 4 >>> 2]
      )
    );
  }

  visitVoid() {
    this.value = undefined
  }
}
