import {LowerValueVisitor} from "./lower-value-visitor.js";
import {ClassNode, InterfaceNode, TypeNode} from "@aldea/core/abi";
import {WasmPointer} from "../arg-reader.js";
import {base16} from "@aldea/core";
import {JigRef} from "../jig-ref.js";
import {isInstructionRef} from "../statement-result.js";

export class LowerArgumentVisitor extends LowerValueVisitor {

  lowerValue(value: any, type: TypeNode): WasmPointer {
    const childVisitor = new LowerArgumentVisitor(this.abi, this.instance, value)
    return childVisitor.travelFromType(type)
  }

  visitInterface(_anInterface: InterfaceNode, typeNode: TypeNode): WasmPointer {
    const jigRef = this.value as JigRef
    if (this.instance === jigRef.package) {
      const classNode = jigRef.package.abi.classByName(jigRef.className())
      return this.visitExportedClass(classNode, typeNode)
    } else {
      return this.visitImportedClass(typeNode, base16.encode(jigRef.package.id))
    }
  }
}
