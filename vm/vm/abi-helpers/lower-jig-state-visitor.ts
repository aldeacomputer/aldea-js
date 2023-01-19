import {ClassNode, TypeNode} from "@aldea/compiler/abi";
import {WasmPointer} from "../arg-reader.js";
import {LowerValueVisitor} from "./lower-value-visitor.js";
import {Pointer} from "@aldea/sdk-js";
import {lowerBuffer} from "../memory.js";

export class LowerJigStateVisitor extends LowerValueVisitor {
  visitExportedClass (node: ClassNode, _type: TypeNode): WasmPointer {
    const origin = this.value // it's a Uint8Array with the origin
    const jigRef = this.instance.currentExec.findJigByOrigin(Pointer.fromBytes(origin))
    return jigRef.ref.ptr
  }

  visitImportedClass(node: TypeNode, pkgId: string): WasmPointer {
    const val = this.value // it's an Uint8Array with the origin
    const mod = this.instance
    const buf = Buffer.from(val);
    const bufferPtr = lowerBuffer(mod, buf)
    const ptr = mod.__new(val.byteLength, mod.abi.typeIds[node.name]);
    const memU32 = new Uint32Array(mod.memory.buffer)
    memU32[ptr >>> 2] = bufferPtr
    return ptr
  }

  lowerValue (value: any, type: TypeNode): WasmPointer {
    const childVisitor = new LowerJigStateVisitor(this.abi, this.instance, value)
    return childVisitor.travelFromType(type)
  }
}
