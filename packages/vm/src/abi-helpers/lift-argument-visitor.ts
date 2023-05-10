import {ClassNode, InterfaceNode, TypeNode} from "@aldea/sdk-js/abi";
import {WasmPointer} from "../arg-reader.js";
import {LiftValueVisitor} from "./lift-value-visitor.js";
import {Externref, Internref} from "../memory.js";
import {Pointer} from "@aldea/sdk-js";

export class LiftArgumentVisitor extends LiftValueVisitor {
  visitExportedClass(classNode: ClassNode, type: TypeNode): any {
    const interRef: Internref = super.visitExportedClass(classNode, type)
    const jigData = this.instance.liftBasicJig(interRef)
    return this.instance.currentExec.getJigRefByOrigin(Pointer.fromBytes(jigData.$output.origin))
  }

  visitImportedClass(node: TypeNode, pkgId: string): any {
    const externRef: Externref = super.visitImportedClass(node, pkgId)
    return this.instance.currentExec.findJigByOrigin(Pointer.fromBytes(externRef.originBuf))
  }

  visitInterface(anInterface: InterfaceNode, _typeNode: TypeNode): any {
    throw new Error('not implemented yet')
  }

  liftValue(type: TypeNode, ptr: WasmPointer): any {
    const childVisitor = new LiftArgumentVisitor(this.abi, this.instance, ptr)
    return childVisitor.travelFromType(type)
  }
}
