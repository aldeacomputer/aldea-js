import {AbiVisitor} from "./abi-visitor.js";
import {AbiTraveler} from "./abi-traveler.js";
import {ClassNode, FieldNode, normalizeTypeName, ObjectNode, TypeNode} from "@aldea/compiler/abi";
import {WasmInstance} from "../wasm-instance.js";
import {WasmPointer} from "../arg-reader.js";
import {Externref, getTypeBytes, getTypedArrayConstructor, Internref, liftBuffer} from "../memory.js";
import {getObjectMemLayout} from "../memory.js";
import {LiftValueVisitor} from "./lift-value-visitor.js";
import {Pointer} from "@aldea/sdk-js";


export class LiftJigStateVisitor extends LiftValueVisitor {
  // constructor(inst: WasmInstance, ptr: WasmPointer) {
  //   super()
  // }

  visitExportedClass (node: ClassNode, traveler: AbiTraveler): void {
    const intRef = new Internref(node.name, Number(this.ptr))
    const jigRef = this.instance.currentExec.findJigByRef(intRef)
    this.value = jigRef
  }

  visitImportedClass(node: TypeNode, pkgId: string): void {
    const mod = this.instance;
    const ptr = Number(this.ptr)
    const bufPtr = new Uint32Array(mod.memory.buffer)[ptr >>> 2]

    const origin = liftBuffer(this.instance, bufPtr)
    this.value = this.instance.currentExec.findJigByOrigin(Pointer.fromBytes(origin))
  }
}
