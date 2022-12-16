import { CBOR } from "cbor-redux"
import {ClassNode, FieldNode} from "@aldea/compiler/abi";
import {WasmInstance} from "./wasm-instance.js";
import {Pointer} from "@aldea/sdk-js";
import {BufWriter} from "@aldea/sdk-js/buf-writer";
import {blake3} from "@aldea/sdk-js/support/hash";

const parse = (data: Uint8Array) => CBOR.decode(data.buffer, null, { mode: "sequence" })

export class JigState {
  origin: Pointer;
  currentLocation: Pointer;
  classIdx: number;
  stateBuf: Uint8Array;
  packageId: Uint8Array;
  serializedLock: any;

  constructor (origin: Pointer, location: Pointer, classIdx: number, stateBuf: Uint8Array, moduleId: Uint8Array, lock: any) {
    this.origin = origin
    this.currentLocation = location
    this.classIdx = classIdx
    this.stateBuf = stateBuf
    this.packageId = moduleId
    this.serializedLock = lock
  }

  parsedState(): any[] {
    return parse(this.stateBuf).data
  }

  classId (): Pointer {
    return new Pointer(this.packageId, this.classIdx)
  }

  objectState (module: WasmInstance): any {
    const fields = this.parsedState()
    const abiNode = module.abi.exports[this.classIdx].code as ClassNode
    if (!abiNode) { throw new Error('should exists') }
    return abiNode.fields.reduce((acumulated: any, current: FieldNode, index: number) => {
      acumulated[current.name] = fields[index]
      return acumulated
    }, {})
  }

  id (): Uint8Array {
    const bufW = new BufWriter()
    bufW.writeBytes(this.origin.toBytes())
    bufW.writeBytes(this.currentLocation.toBytes())
    bufW.writeBytes(this.packageId)
    bufW.writeU32(this.classIdx)
    bufW.writeU8(this.serializedLock.type)
    if (this.serializedLock.data) {
      bufW.writeBytes(this.serializedLock.data)
    }
    bufW.writeU32(this.stateBuf.byteLength)
    bufW.writeBytes(this.stateBuf)
    return blake3(bufW.data)
  }
}
