import {base16, Pointer} from "@aldea/core";
import {
  ClassNode,
  FieldNode,
  InterfaceNode,
  normalizeTypeName,
  ObjectNode,
  TypeNode,
} from "@aldea/core/abi";
import {AbiTraveler} from "./abi-traveler.js";
import {WasmInstance} from "../wasm-instance.js";
import {WasmPointer} from "../arg-reader.js";
import {
  Externref,
  getObjectMemLayout,
  getTypeBytes,
  getTypedArrayConstructor, getTypedArrayForPtr,
  Internref,
  liftBuffer
} from "../memory.js";
import {basicJigAbiNode, emptyTn, outputTypeNode} from "./well-known-abi-nodes.js";
import {AbiAccess} from "./abi-access.js";


export class LiftValueVisitor extends AbiTraveler<any> {
  instance: WasmInstance
  ptr: WasmPointer

  constructor(abi: AbiAccess, inst: WasmInstance, ptr: WasmPointer) {
    super(abi)
    this.instance = inst
    this.ptr = ptr
  }

  visitArray(innerType: TypeNode): any {
    const mod = this.instance
    const ptr = Number(this.ptr)
    const memU32 = new Uint32Array(mod.memory.buffer)
    const start = memU32[ptr + 4 >>> 2]
    const length = memU32[ptr + 12 >>> 2]
    const elBytes = getTypeBytes(innerType)
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
    const TypedArray = getTypedArrayForPtr(innerType)
    const values = new Array(length)

    for (let i = 0; i < length; i++) {
      const nextPos = start + ((i << align) >>> 0)
      const nextPtr = new TypedArray(mod.memory.buffer)[nextPos >>> align]
      values[i] = this.liftValue(innerType, nextPtr)
    }
    return values
  }

  liftValue (type: TypeNode, ptr: WasmPointer): any {
    const childVisitor = new LiftValueVisitor(this.abi, this.instance, ptr)
    return childVisitor.travelFromType(type)
  }

  visitStaticArray(innerType: TypeNode): any {
    const mod = this.instance
    const ptr = Number(this.ptr)
    const memU32 = new Uint32Array(mod.memory.buffer)
    const start = ptr
    const elBytes = getTypeBytes(innerType)
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
    const length = memU32[ptr - 4 >>> 2] >>> align
    const TypedArray = getTypedArrayForPtr(innerType)
    const values = new Array(length)

    for (let i = 0; i < length; i++) {
      const nextPos = start + ((i << align))
      const nextPtr = new TypedArray(mod.memory.buffer)[nextPos >>> align]
      values[i] = this.liftValue(innerType, nextPtr)
    }
    return values
  }

  visitIBigNumberValue(): any {
    return BigInt.asIntN(64, this.ptr as bigint)
  }

  visitUBigNumberValue(): any {
    return BigInt.asUintN(64, this.ptr as bigint)
  }

  visitBoolean(): any {
    return !!this.ptr
  }

  visitImportedClass(node: TypeNode, pkgId: string): any {
    const mod = this.instance;
    const ptr = Number(this.ptr)
    const outputPtr = new Uint32Array(mod.memory.buffer)[ptr >>> 2]

    const output = this.liftValue(outputTypeNode, outputPtr)

    const origin = output.origin
    return new Externref(normalizeTypeName(node), origin)
  }

  visitMap(keyType: TypeNode, valueType: TypeNode): any {
    const mod = this.instance
    const ptr = Number(this.ptr)
    const mem32 = new Uint32Array(mod.memory.buffer)
    const start = mem32[ptr + 8 >>> 2]
    const size  = mem32[ptr + 16 >>> 2]

    const keyTypeNode = keyType;
    const KeyTypedArray = getTypedArrayForPtr(keyTypeNode)
    const kBytes = getTypeBytes(keyTypeNode)
    const kAlign = kBytes > 1 ? Math.ceil(kBytes / 3) : 0
    const kEntries = new KeyTypedArray(liftBuffer(mod, start).buffer)

    const valueTypeNode = valueType;
    const ValTypedArray = getTypedArrayForPtr(valueTypeNode)
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
      const key = this.liftValue(keyTypeNode, keyPtr)

      const valPtr = vEntries[valPos >>> vAlign]
      const val = this.liftValue(valueTypeNode, valPtr)

      map.set(key, val)
    }

    return map
  }

  visitPlainObject(objNode: ObjectNode, _typeNode: TypeNode): any {
    const mod = this.instance
    const ptr = Number(this.ptr)
    const offsets = getObjectMemLayout(objNode)
    return objNode.fields.reduce((obj: any, n: FieldNode, _i) => {
      const TypedArray = getTypedArrayForPtr(n.type)
      const { align, offset } = offsets[n.name]
      const nextPtr = new TypedArray(mod.memory.buffer)[ptr + offset >>> align]
      obj[n.name] = this.liftValue(n.type, nextPtr)
      return obj
    }, {})
  }

  visitInterface(anInterface: InterfaceNode, _typeNode: TypeNode): any {
    const visitor = new LiftValueVisitor(this.abi, this.instance, Number(this.ptr) + 1)
    const basicJig = visitor.visitPlainObject(basicJigAbiNode, _typeNode)

    const jig = this.instance.currentExec.findJigByOrigin(Pointer.fromBytes(basicJig.$output.origin))

    const className = jig.className()
    const clsTypeNode = emptyTn(className)
    if (jig.package === this.instance) {
      const classNode = this.abi.classByName(className)
      return this.visitExportedClass(classNode, clsTypeNode)
    } else {
      return this.visitImportedClass(clsTypeNode, base16.encode(jig.classPtr().idBuf))
    }
  }


  visitSet(innerType: TypeNode): any {
    const mod = this.instance
    const ptr = Number(this.ptr)
    const mem32 = new Uint32Array(mod.memory.buffer)
    const start = mem32[ptr + 8 >>> 2]
    const size  = mem32[ptr + 16 >>> 2]

    const TypedArray = getTypedArrayForPtr(innerType)
    const vBytes = getTypeBytes(innerType)
    const vAlign = vBytes > 1 ? Math.ceil(vBytes / 3) : 0
    const vEntries = new TypedArray(liftBuffer(mod, start).buffer)

    const vrBytes = Math.max(vBytes, 4)
    const entrySize = vrBytes + Math.max(vrBytes, 4)

    const set = new Set()
    for (let i = 0; i < size; i++) {
      const valPos = i * entrySize
      const valPtr = vEntries[valPos >>> vAlign]
      const val = this.liftValue(innerType, valPtr)
      set.add(val)
    }
    return set
  }

  visitSmallNumberValue(typeName: string): any {
    return Number(this.ptr)
  }

  visitString(): any {
    const ptr = Number(this.ptr)
    const mod = this.instance
    const end = ptr + new Uint32Array(mod.memory.buffer)[ptr - 4 >>> 2] >>> 1
    const memU16 = new Uint16Array(mod.memory.buffer)
    let start = ptr >>> 1, string = "";
    while (end - start > 1024) {
      string += String.fromCharCode(...memU16.subarray(start, start += 1024))
    }
    return string + String.fromCharCode(...memU16.subarray(start, end))
  }

  visitTypedArray(typeName: string): any {
    const ptr = Number(this.ptr)
    const mod = this.instance
    const memU32 = new Uint32Array(mod.memory.buffer);
    const TypedArray = getTypedArrayConstructor(emptyTn(typeName))
    return new TypedArray(
      mod.memory.buffer,
      memU32[ptr + 4 >>> 2],
      memU32[ptr + 8 >>> 2] / TypedArray.BYTES_PER_ELEMENT
    ).slice();
  }

  visitArrayBuffer(): any {
    const mod = this.instance
    const ptr = Number(this.ptr)
    return new Uint8Array(
      mod.memory.buffer.slice(
        ptr,
        ptr + new Uint32Array(mod.memory.buffer)[ptr - 4 >>> 2]
      )
    );
  }

  visitVoid(): any {
    return undefined
  }

  visitExportedClass(classNode: ClassNode, _type: TypeNode): any {
    return new Internref(classNode.name, Number(this.ptr))
  }
}
