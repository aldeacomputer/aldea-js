import {Pointer} from "@aldea/core";
import {TypeNode} from "@aldea/core/abi";
import {WasmPointer} from "../arg-reader.js";
import {LiftValueVisitor} from "./lift-value-visitor.js";
import {Externref, Internref} from "../memory.js";
import {AbiInterface} from "./abi-helpers/abi-interface.js";
import {AbiClass} from "./abi-helpers/abi-class.js";

export class LiftArgumentVisitor extends LiftValueVisitor {
  visitExportedClass(classNode: AbiClass, type: TypeNode): any {
    const interRef: Internref = super.visitExportedClass(classNode, type)
    const jigData = this.instance.liftBasicJig(interRef)
    return this.instance.currentExec.getJigRefByOrigin(Pointer.fromBytes(jigData.$output.origin))
  }

  visitImportedClass(node: TypeNode, pkgId: string): any {
    const externRef: Externref = super.visitImportedClass(node, pkgId)
    return this.instance.currentExec.findJigByOrigin(Pointer.fromBytes(externRef.originBuf))
  }

  visitInterface(anInterface: AbiInterface, typeNode: TypeNode): any {
    return super.visitInterface(anInterface, typeNode)
  }

  liftValue(type: TypeNode, ptr: WasmPointer): any {
    const childVisitor = new LiftArgumentVisitor(this.abi, this.instance, ptr)
    return childVisitor.travelFromType(type)
  }
}
