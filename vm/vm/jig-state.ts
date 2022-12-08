import { CBOR } from "cbor-redux"
import {ClassNode, FieldNode} from "@aldea/compiler/abi";
import {WasmInstance} from "./wasm-instance.js";
import {Location} from "@aldea/sdk-js";
import {Digest} from "@aldea/sdk-js/transaction/digest";

const parse = (data: Uint8Array) => CBOR.decode(data.buffer, null, { mode: "sequence" })

export class JigState {
  id: Location;
  currentLocation: Location;
  classIdx: number;
  stateBuf: Uint8Array;
  packageId: Uint8Array;
  serializedLock: any;

  constructor (origin: Location, location: Location, classIdx: number, stateBuf: Uint8Array, moduleId: Uint8Array, lock: any) {
    this.id = origin
    this.currentLocation = location
    this.classIdx = classIdx
    this.stateBuf = stateBuf
    this.packageId = moduleId
    this.serializedLock = lock
  }

  parsedState(): any[] {
    return parse(this.stateBuf).data
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

  digest () {
    const dig = new Digest()
    dig.addBuff(this.id.toBuffer())
    dig.addBuff(this.packageId)
    dig.addNumber(this.classIdx)
    dig.addNumber(this.serializedLock.type)
    dig.addBuff(this.serializedLock.data)
    dig.addBuff(this.stateBuf)
  }
}
