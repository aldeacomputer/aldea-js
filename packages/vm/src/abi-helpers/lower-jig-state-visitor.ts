import {base16} from "@aldea/core";
import {ClassNode, InterfaceNode, TypeNode} from "@aldea/core/abi";
import {WasmPointer} from "../arg-reader.js";
import {LowerValueVisitor} from "./lower-value-visitor.js";
import {emptyTn} from "./well-known-abi-nodes.js";
import {AbiInterface} from "./abi-helpers/abi-interface.js";
import {AbiClass} from "./abi-helpers/abi-class.js";

export class LowerJigStateVisitor extends LowerValueVisitor {
  visitExportedClass (node: AbiClass, type: TypeNode): WasmPointer {
    //const origin = this.value // it's a Uint8Array with the origin
    this.value = this.instance.currentExec.findJigByOrigin(this.value)
    return super.visitExportedClass(node, type)
  }

  visitImportedClass(node: TypeNode, pkgId: string): WasmPointer {
    this.value = this.instance.currentExec.findJigByOrigin(this.value)
    return super.visitImportedClass(node, pkgId)
  }

  visitInterface(_anInterface: AbiInterface, typeNode: TypeNode): WasmPointer {
    const jig = this.instance.currentExec.findJigByOrigin(this.value)
    const className = jig.className();
    if (jig.package === this.instance) {
      const classNode = this.abi.exportedByName(className).get().toAbiClass()
      const concreteType = emptyTn(className);
      return this.visitExportedClass(classNode, concreteType)
    } else {
      return this.visitImportedClass(typeNode, base16.encode(jig.package.id))
    }
  }

  lowerValue (value: any, type: TypeNode): WasmPointer {
    const childVisitor = new LowerJigStateVisitor(this.abi, this.instance, value)
    return childVisitor.travelFromType(type)
  }
}
