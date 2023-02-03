import {ClassNode, InterfaceNode, TypeNode} from "@aldea/compiler/abi";
import {WasmPointer} from "../arg-reader.js";
import {LiftValueVisitor} from "./lift-value-visitor.js";
import {Externref, Internref} from "../memory.js";

export class LiftArgumentVisitor extends LiftValueVisitor {
  visitExportedClass(classNode: ClassNode, type: TypeNode): any {
    const interRef: Internref = super.visitExportedClass(classNode, type)
    return this.instance.currentExec.jigByInternRef(interRef)
  }

  visitImportedClass(node: TypeNode, pkgId: string): any {
    const externRef: Externref = super.visitImportedClass(node, pkgId)
    return this.instance.currentExec.findJigByOrigin(externRef.origin)
  }

  visitInterface(anInterface: InterfaceNode, _typeNode: TypeNode): any {
    throw new Error('not implemented yet')
  }

  liftValue(type: TypeNode, ptr: WasmPointer): any {
    const childVisitor = new LiftArgumentVisitor(this.abi, this.instance, ptr)
    return childVisitor.travelFromType(type)
  }
}
