import {ClassNode, TypeNode} from "@aldea/compiler/abi";
import {WasmPointer} from "../arg-reader.js";
import {Internref, liftBuffer} from "../memory.js";
import {LiftValueVisitor} from "./lift-value-visitor.js";

export class LiftJigStateVisitor extends LiftValueVisitor {

  visitExportedClass (node: ClassNode, _type: TypeNode): any {
    const intRef = new Internref(node.name, Number(this.ptr))
    const jigRef = this.instance.currentExec.findJigByRef(intRef)
    return jigRef.origin.toBytes()
  }

  visitImportedClass(node: TypeNode, pkgId: string): any {
    const mod = this.instance;
    const ptr = Number(this.ptr)
    const bufPtr = new Uint32Array(mod.memory.buffer)[ptr >>> 2]

    return liftBuffer(this.instance, bufPtr)
  }

  liftValue(type: TypeNode, ptr: WasmPointer): any {
    const childVisitor = new LiftJigStateVisitor(this.abi, this.instance, ptr)
    return childVisitor.travelFromType(type)
  }
}
