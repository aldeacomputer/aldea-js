import {ClassNode, FieldNode} from "@aldea/compiler/abi";
import {WasmInstance} from "./wasm-instance.js";
import {Address, Output, Pointer} from "@aldea/sdk-js";
import {BufWriter} from "@aldea/sdk-js/buf-writer";
import {blake3} from "@aldea/sdk-js/support/hash";
import {decodeSequence} from "./cbor.js";
import {Option} from "./support/option.js";
import {SerializedLock} from "./locks/serialized-lock.js";

export class JigState {
  origin: Pointer;
  currentLocation: Pointer;
  classIdx: number;
  stateBuf: Uint8Array;
  packageId: Uint8Array;
  private lock: SerializedLock;
  createdAt: number;

  constructor (
    origin: Pointer,
    location: Pointer,
    classIdx: number,
    stateBuf: Uint8Array,
    moduleId: Uint8Array,
    lock: SerializedLock,
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

  get serializedLock (): SerializedLock {
    return this.lock
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

  serialize (): Uint8Array {
    const bufW = new BufWriter()
    bufW.writeBytes(this.origin.toBytes())
    bufW.writeBytes(this.currentLocation.toBytes())
    bufW.writeBytes(this.packageId)
    bufW.writeU32(this.classIdx)
    bufW.writeU8(this.lock.type)
    if (this.lock.data) {
      bufW.writeBytes(this.lock.data)
    }
    bufW.writeVarInt(this.stateBuf.byteLength)
    bufW.writeBytes(this.stateBuf)
    return bufW.data
  }

  id (): Uint8Array {
    return blake3(this.serialize())
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
      type: this.lock.type,
      data: this.lock.data
    }
  }

  lockType (): number {
    return this.lock.type
  }

  lockData (): Uint8Array {
    return this.lock.data
  }

  isNew(): boolean {
    return this.origin.equals(this.currentLocation);
  }

  address(): Option<Address> {
    return this.lock.address();
  }

  static fromSdkOutput (output: Output) {
    return new this(
      output.origin,
      output.location,
      output.classPtr.idx,
      output.stateBuf,
      output.classPtr.idBuf,
      SerializedLock.fromSdkLock(output.lock),
      10
    )
  }
}
