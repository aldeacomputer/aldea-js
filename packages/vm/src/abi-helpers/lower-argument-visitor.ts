import {LowerValueVisitor} from "./lower-value-visitor.js";
import {ClassNode, InterfaceNode, TypeNode} from "@aldea/compiler/abi";
import {WasmPointer} from "../arg-reader.js";
import {base16, InstructionRef} from "@aldea/sdk-js";
import {JigRef} from "../jig-ref.js";

export class LowerArgumentVisitor extends LowerValueVisitor {
  visitExportedClass(classNode: ClassNode, type: TypeNode): WasmPointer {
    if (this.value instanceof InstructionRef) {
      this.value = this.instance.currentExec.getStatementResult(this.value.idx).asJig()
    }
    return super.visitExportedClass(classNode, type);
  }

  visitImportedClass(node: TypeNode, pkgId: string): WasmPointer {
    if (this.value instanceof InstructionRef) {
      this.value = this.instance.currentExec.getStatementResult(this.value.idx).asJig()
    }
    return super.visitImportedClass(node, pkgId);
  }

  lowerValue(value: any, type: TypeNode): WasmPointer {
    const childVisitor = new LowerArgumentVisitor(this.abi, this.instance, value)
    return childVisitor.travelFromType(type)
  }

  visitInterface(anInterface: InterfaceNode, typeNode: TypeNode): WasmPointer {
    const jigRef = this.value as JigRef
    if (this.instance === jigRef.package) {
      const classNode = jigRef.package.abi.classByName(jigRef.className())
      return this.visitExportedClass(classNode, typeNode)
    } else {
      return this.visitImportedClass(typeNode, base16.encode(jigRef.package.id))
    }
  }
}
