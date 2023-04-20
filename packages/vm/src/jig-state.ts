import {ClassNode, FieldNode} from "@aldea/compiler/abi";
import {WasmInstance} from "./wasm-instance.js";
import {Address, Output, Pointer, blake3, Lock} from "@aldea/sdk-js";
import {decodeSequence} from "./cbor.js";
import {Option} from "./support/option.js";
import {SerializedLock} from "./locks/serialized-lock.js";

export class JigState {
  private output: Output
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
    this.output = new Output(
      origin,
      location,
      new Pointer(moduleId, classIdx),
      new Lock(Number(lock.type), lock.data),
      stateBuf
    )
    this.createdAt = createdAt
  }

  get serializedLock (): SerializedLock {
    return SerializedLock.fromSdkLock(this.output.lock)
  }

  get classIdx (): number {
    return this.output.classPtr.idx
  }

  get origin (): Pointer {
    return this.output.origin
  }

  get currentLocation(): Pointer {
    return this.output.location
  }

  get packageId(): Uint8Array {
    return this.classPtr().idBuf
  }

  get stateBuf(): Uint8Array {
    return this.output.stateBuf
  }

  parsedState(): any[] {
    return decodeSequence(this.output.stateBuf)
  }

  classPtr (): Pointer {
    return this.output.classPtr
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
    return this.output.toBytes()
  }

  id (): Uint8Array {
    return blake3.hash(this.serialize())
  }

  outputObject(): any {
    return {
      origin: this.origin.toBytes(),
      location: this.currentLocation.toBytes(),
      classPtr: this.output.classPtr
    }
  }

  lockObject() {
    return {
      origin: this.origin.toBytes(),
      type: this.output.lock.type,
      data: this.output.lock.data
    }
  }

  lockType (): number {
    return this.output.lock.type
  }

  lockData (): Uint8Array {
    return this.output.lock.data
  }

  isNew(): boolean {
    return this.origin.equals(this.currentLocation);
  }

  address(): Option<Address> {
    const lock = SerializedLock.fromSdkLock(this.output.lock)
    return lock.address();
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
