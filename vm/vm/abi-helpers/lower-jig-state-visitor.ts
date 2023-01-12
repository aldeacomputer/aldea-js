import {AbiVisitor} from "./abi-visitor.js";
import {AbiTraveler} from "./abi-traveler.js";
import {ClassNode, normalizeTypeName, ObjectNode, TypeNode} from "@aldea/compiler/abi";
import {WasmInstance as Module, WasmInstance} from "../wasm-instance.js";
import {getElementBytes, getObjectMemLayout, getTypeBytes, getTypedArrayConstructor, lowerBuffer} from "../memory.js";
import {WasmPointer} from "../arg-reader.js";
import {blake3} from "@noble/hashes/blake3";
import {bytesToHex as toHex} from "@noble/hashes/utils";
import {LowerValueVisitor} from "./lower-value-visitor.js";

function hasTypedArrayConstructor(type: TypeNode): boolean {
  return [
    'f32', 'f64',
    'i8', 'i16', 'i32', 'i64',
    'u8', 'u16', 'u32', 'u64',
  ].includes(type.name)
}

export class LowerJigStateVisitor extends LowerValueVisitor {
  visitExportedClass (node: ClassNode, traveler: AbiTraveler): void {
    const origin = this.value // it's a Uint8Array with the origin
    const jigRef = this.instance.currentExec.findJigByOrigin(origin)
    this.retPtr = jigRef.ref.ptr
  }

  visitImportedClass(node: TypeNode, pkgId: string): void {
    const val = this.value
    const mod = this.instance
    const buf = Buffer.from(val);
    const bufferPtr = lowerBuffer(mod, buf)
    const ptr = mod.__new(val.originBuf.byteLength, mod.abi.typeIds[val.className()]);
    const memU32 = new Uint32Array(mod.memory.buffer)
    memU32[ptr >>> 2] = bufferPtr
    this.retPtr = ptr
  }
}
