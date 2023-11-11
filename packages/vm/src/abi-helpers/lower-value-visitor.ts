import {base16, Pointer} from "@aldea/core";
import {ClassNode, FieldNode, InterfaceNode, normalizeTypeName, TypeNode} from "@aldea/core/abi";
import {AbiTraveler} from "./abi-traveler.js";
import {WasmContainer as Module, WasmContainer} from "../wasm-container.js";
import {
  getElementBytes,
  getObjectMemLayout,
  getTypeBytes,
  getTypedArrayConstructor,
  getTypedArrayForPtr, Internref
} from "../memory.js";
import {WasmPointer} from "../arg-reader.js";
import {blake3} from "@noble/hashes/blake3";
import {bytesToHex as toHex} from "@noble/hashes/utils";
import {JigRef} from "../jig-ref.js";
import {emptyTn, outputAbiNode} from "./well-known-abi-nodes.js";
import {AbiAccess} from "./abi-access.js";
import {isInstructionRef} from "../statement-result.js";
import {AbiPlainObject} from "./abi-helpers/abi-plain-object.js";
import {AbiInterface} from "./abi-helpers/abi-interface.js";
import {AbiClass} from "./abi-helpers/abi-class.js";

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
  instance: WasmContainer
  value: any

  constructor(abi: AbiAccess, inst: WasmContainer, value: any) {
    super(abi)
    this.instance = inst
    this.value = value
    if (value && isInstructionRef(value)) {
      const coso = inst.currentExec.getStatementResult(value.idx)
      this.value = coso.value
    }
  }

  private lowerJigProxy (type: TypeNode) {
    return 0
  }

  visitExportedClass (_classNode: AbiClass, type: TypeNode): WasmPointer {
    if (this.value instanceof Internref) {
      let basicJig = this.instance.liftBasicJig(this.value);
      this.value = this.instance.currentExec.findJigByOrigin(Pointer.fromBytes(basicJig.$output.origin))
    }
    return this.lowerJigProxy(type)
  }

  visitArray(innerType: TypeNode): WasmPointer {
    return 0
  }

  visitStaticArray(innerType: TypeNode): WasmPointer {
    return 0
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

  visitPlainObject(fields: FieldNode[], typeNode: TypeNode): WasmPointer {
    return 0
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
    return 0
  }

  visitArrayBuffer(): WasmPointer {
    const mod = this.instance
    const val = this.value
    const ptr = mod.__new(val.byteLength, BUFFER_RTID);
    new Uint8Array(mod.memory.buffer).set(new Uint8Array(val), ptr);
    return ptr;
  }


  private lowerEmptySetOrMap(mod: Module, type: TypeNode, entrySize: number): number {
    return 0
  }

  visitVoid(): WasmPointer {
    return 0
  }

  visitInterface(_anInterface: AbiInterface, typeNode: TypeNode): WasmPointer {
    const jig = this.value as JigRef
    if (jig.package === this.instance) {
      const className = jig.className();
      const concreteTypeNode = emptyTn(className);
      const classNode = this.abi.exportedByName(className).get().toAbiClass()
      return this.visitExportedClass(classNode, concreteTypeNode)
    } else {
      return this.visitImportedClass(typeNode, base16.encode(jig.package.id))
    }
  }
}
