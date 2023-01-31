import {ClassNode, InterfaceNode, TypeNode} from "@aldea/compiler/abi";
import {WasmPointer} from "../arg-reader.js";
import {LowerValueVisitor} from "./lower-value-visitor.js";
import {base16, Pointer} from "@aldea/sdk-js";

export class LowerJigStateVisitor extends LowerValueVisitor {
  visitExportedClass (node: ClassNode, _type: TypeNode): WasmPointer {
    const origin = this.value // it's a Uint8Array with the origin
    const jigRef = this.instance.currentExec.findJigByOrigin(Pointer.fromBytes(origin))
    return jigRef.ref.ptr
  }

  visitImportedClass(node: TypeNode, pkgId: string): WasmPointer {
    this.value = this.instance.currentExec.findJigByOrigin(Pointer.fromBytes(this.value))
    return super.visitImportedClass(node, pkgId)
  }

  visitInterface(anInterface: InterfaceNode, typeNode: TypeNode): WasmPointer {
    const jig = this.instance.currentExec.findJigByOrigin(Pointer.fromBytes(this.value))
    const className = jig.className();
    const typenode = {name: className, args: [] };
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
