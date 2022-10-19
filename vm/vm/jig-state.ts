import { CBOR } from "cbor-redux"
import {FieldNode, findExportedObject} from "@aldea/compiler/abi";
import {WasmInstance} from "./wasm-instance.js";

const parse = (data: ArrayBuffer) => CBOR.decode(data, null, { mode: "sequence" })

export class JigState {
  origin: string;
  location: string;
  className: string;
  stateBuf: ArrayBuffer;
  moduleId: string;
  serializedLock: any;

  constructor (origin: string, location: string, className: string, stateBuf: ArrayBuffer, moduleId: string, lock: any) {
    this.origin = origin
    this.location = location
    this.className = className
    this.stateBuf = stateBuf
    this.moduleId = moduleId
    this.serializedLock = lock
  }

  parsedState(): any[] {
    return parse(this.stateBuf).data
  }

  objectState (module: WasmInstance): any {
    const fields = this.parsedState()
    const abiNode = findExportedObject(module.abi, this.className)
    if (!abiNode) { throw new Error('should exists') }
    return abiNode.fields.reduce((acumulated: any, current: FieldNode, index: number) => {
      acumulated[current.name] = fields[index]
      return acumulated
    }, {})
  }
}
