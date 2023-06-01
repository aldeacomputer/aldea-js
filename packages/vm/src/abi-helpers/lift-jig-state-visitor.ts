import { Pointer } from "@aldea/core";
import {ClassNode, InterfaceNode, TypeNode} from "@aldea/core/abi";
import {WasmPointer} from "../arg-reader.js";
import {Externref} from "../memory.js";
import {LiftValueVisitor} from "./lift-value-visitor.js";
import {basicJigAbiNode, outputAbiNode, outputTypeNode} from "./well-known-abi-nodes.js";

export class LiftJigStateVisitor extends LiftValueVisitor {

  visitExportedClass (node: ClassNode, type: TypeNode): any {
    const object = this.visitPlainObject(basicJigAbiNode, outputTypeNode)

    return Pointer.fromBytes(new Uint8Array(object.$output.origin))
    // const intRef = new Internref(node.name, Number(this.ptr))
    // const jigRef = this.instance.currentExec.findJigByRef(intRef)
    // return jigRef.origin.toBytes()
  }

  visitImportedClass(node: TypeNode, pkgId: string): any {
    const extRef = super.visitImportedClass(node, pkgId) as Externref

    // const mod = this.instance;
    // const ptr = Number(this.ptr)
    // const bufPtr = new Uint32Array(mod.memory.buffer)[ptr >>> 2]

    return Pointer.fromBytes(new Uint8Array(extRef.originBuf))
  }


  visitInterface(anInterface: InterfaceNode, _typeNode: TypeNode): any {

    return super.visitInterface(anInterface, _typeNode)
  }

  liftValue(type: TypeNode, ptr: WasmPointer): any {
    const childVisitor = new LiftJigStateVisitor(this.abi, this.instance, ptr)
    return childVisitor.travelFromType(type)
  }

  // Here we override LiftValueVisitor.visitArrayBuffer()
  // The original method is programmed to return arraybuffers as uint8arrays
  // But for jig state, BCS really expects an ArrayBuffer
  // hence this little awkward override
  visitArrayBuffer(): any {
    const u8arr = super.visitArrayBuffer()
    return u8arr.buffer
  }
}
