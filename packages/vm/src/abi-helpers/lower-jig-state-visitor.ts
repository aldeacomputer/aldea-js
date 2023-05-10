import {base16, Pointer} from "@aldea/sdk-js";
import {ClassNode, InterfaceNode, TypeNode} from "@aldea/sdk-js/abi";
import {WasmPointer} from "../arg-reader.js";
import {LowerValueVisitor} from "./lower-value-visitor.js";
import {emptyTn} from "./well-known-abi-nodes.js";

export class LowerJigStateVisitor extends LowerValueVisitor {
  visitExportedClass (node: ClassNode, type: TypeNode): WasmPointer {
    //const origin = this.value // it's a Uint8Array with the origin
    this.value = this.instance.currentExec.findJigByOrigin(this.value)
    return super.visitExportedClass(node, type)
  }

  visitImportedClass(node: TypeNode, pkgId: string): WasmPointer {
    this.value = this.instance.currentExec.findJigByOrigin(this.value)
    return super.visitImportedClass(node, pkgId)
  }

  visitInterface(anInterface: InterfaceNode, typeNode: TypeNode): WasmPointer {
    const jig = this.instance.currentExec.findJigByOrigin(this.value)
    const className = jig.className();
    const typenode = emptyTn(className);
    if (jig.package === this.instance) {
      const classNode = this.abi.classByName(className)
      return this.visitExportedClass(classNode, typenode)
    } else {
      return this.visitImportedClass(typenode, base16.encode(jig.package.id))
    }
  }

  lowerValue (value: any, type: TypeNode): WasmPointer {
    const childVisitor = new LowerJigStateVisitor(this.abi, this.instance, value)
    return childVisitor.travelFromType(type)
  }
}
