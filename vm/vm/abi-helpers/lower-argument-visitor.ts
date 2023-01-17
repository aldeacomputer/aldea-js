import {LowerValueVisitor} from "./lower-value-visitor.js";
import {ClassNode, TypeNode} from "@aldea/compiler/abi";
import {AbiTraveler} from "./abi-traveler.js";
import {WasmPointer} from "../arg-reader.js";
import {InstructionRef} from "@aldea/sdk-js";

export class LowerArgumentVisitor extends LowerValueVisitor {
  visitExportedClass(classNode: ClassNode, type: TypeNode, traveler: AbiTraveler): WasmPointer {
    if (this.value instanceof InstructionRef) {
      this.value = this.instance.currentExec.getStatementResult(this.value.idx).asJig()
    }
    return super.visitExportedClass(classNode, type, traveler);
  }

  visitImportedClass(node: TypeNode, pkgId: string): WasmPointer {
    if (this.value instanceof InstructionRef) {
      this.value = this.instance.currentExec.getStatementResult(this.value.idx).asJig()
    }
    return super.visitImportedClass(node, pkgId);
  }

  lowerValue(value: any, type: TypeNode, traveler: AbiTraveler): WasmPointer {
    const childVisitor = new LowerArgumentVisitor(this.instance, value)
    return traveler.acceptForType(type, childVisitor)
  }
}
