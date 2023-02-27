import {ClassNode, FieldNode} from "@aldea/compiler/abi";
import {WasmInstance} from "./wasm-instance.js";
import {Address, Pointer} from "@aldea/sdk-js";
import {BufWriter} from "@aldea/sdk-js/buf-writer";
import {blake3} from "@aldea/sdk-js/support/hash";
import {decodeSequence} from "./cbor.js";
import {Lock} from "./locks/lock.js";
import {Option} from "./support/option.js";

export class JigState {
  origin: Pointer;
  currentLocation: Pointer;
  classIdx: number;
  stateBuf: Uint8Array;
  packageId: Uint8Array;
  private lock: Lock;
  createdAt: number;

  constructor (
    origin: Pointer,
    location: Pointer,
    classIdx: number,
    stateBuf: Uint8Array,
    moduleId: Uint8Array,
    lock: Lock,
    createdAt: number
  ) {
    this.origin = origin
    this.currentLocation = location
    this.classIdx = classIdx
    this.stateBuf = stateBuf
    this.packageId = moduleId
    this.lock = lock
    this.createdAt = createdAt
  }

  get serializedLock (): any {
    return this.lock.serialize()
  }

  parsedState(): any[] {
    return decodeSequence(this.stateBuf)
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
    bufW.writeU8(this.lock.typeNumber())
    if (this.lock.data) {
      bufW.writeBytes(this.lock.data())
    }
    bufW.writeVarInt(this.stateBuf.byteLength)
    bufW.writeBytes(this.stateBuf)
    return blake3(bufW.data)
  }

  outputObject(): any {
    return {
      origin: this.origin.toBytes(),
      location: this.currentLocation.toBytes(),
      classPtr: new Pointer(this.packageId, this.classIdx).toBytes()
    }
  }

  lockObject() {
    return {
      origin: this.origin.toBytes(),
      type: this.lock.typeNumber(),
      data: this.lock.data()
    }
  }

  lockType (): number {
    return this.lock.typeNumber()
  }

  isNew(): boolean {
    return this.origin.equals(this.currentLocation);
  }

  address(): Option<Address> {
    return this.lock.address();
  }
}
