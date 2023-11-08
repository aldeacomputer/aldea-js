import {Address, Output, Pointer, blake3, Lock, BCS} from "@aldea/core";
import {Abi} from "@aldea/core/abi";
import {Option} from "./support/option.js";
import {SerializedLock} from "./locks/serialized-lock.js";
import {AbiAccess} from "./abi-helpers/abi-access.js";

export class JigState {
  private output: Output

  constructor (
    origin: Pointer,
    location: Pointer,
    classIdx: number,
    stateBuf: Uint8Array,
    moduleId: Uint8Array,
    lock: SerializedLock,
  ) {
    this.output = new Output(
      origin,
      location,
      new Pointer(moduleId, classIdx),
      new Lock(Number(lock.type), lock.data),
      stateBuf
    )
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

  parsedState(abi: Abi): any[] {
    const abiAccess = new AbiAccess(abi)
    const abiNode = abiAccess.exportedByIdx(this.classIdx).get().toAbiClass()
    const bcs = new BCS(abi)
    return bcs.decode(abiNode.name, this.output.stateBuf)
  }

  classPtr (): Pointer {
    return this.output.classPtr
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
      classPtr: this.output.classPtr.toBytes()
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

  static fromOutput (output: Output) {
    return new this(
      output.origin,
      output.location,
      output.classPtr.idx,
      output.stateBuf,
      output.classPtr.idBuf,
      SerializedLock.fromSdkLock(output.lock)
    )
  }

  toOutput (): Output {
    return this.output
  }
}
