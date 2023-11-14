import {WasmContainer} from './wasm-container.js';
import {Lock} from "./locks/lock.js";
import {Pointer} from "@aldea/core";
import {AbiClass} from "./memory/abi-helpers/abi-class.js";
import {WasmWord} from "./wasm-word.js";
import {AbiType} from "./memory/abi-helpers/abi-type.js";
import {lockAbiNode} from "./memory/well-known-abi-nodes.js";

export class ContainerRef {
  ptr: WasmWord
  ty: AbiType
  container: WasmContainer

  constructor (ptr: WasmWord, ty: AbiType, container: WasmContainer) {
    this.ptr = ptr
    this.ty = ty
    this.container = container
  }

  lift (): Uint8Array {
    return this.container.lifter.lift(this.ptr, this.ty)
  }

  equals (ref: ContainerRef) {
    return this.container.hash === ref.container.hash &&
        this.ptr.equals(ref.ptr)
  }
}

export class JigRef {
  ref: ContainerRef
  classIdx: number;
  origin: Pointer;
  latestLocation: Pointer;
  lock: Lock;

  constructor (ref: ContainerRef, classIdx: number, origin: Pointer, latestLocation: Pointer, lock: Lock) {
    this.ref = ref
    this.classIdx = classIdx
    this.origin = origin
    this.latestLocation = latestLocation
    this.lock = lock
  }

  get originBuf (): ArrayBuffer {
    return this.origin.toBytes()
  }

  changeLock (newLock: Lock) {
    const container = this.ref.container
    const lockTy = AbiType.fromName('Lock');
    const ptr = container.low.lower(newLock.serialize(this.origin.toBytes()), lockTy)
    container.mem.write(this.ref.ptr.plus(4), ptr.serialize(lockTy))
    this.lock = newLock
  }

  className (): string {
    return this.classAbi().name
  }

  outputObject (): any {
    return {
      origin: this.origin.toBytes(),
      location: this.latestLocation.toBytes(),
      classPtr: this.classPtr().toBytes()
    }
  }

  classPtr (): Pointer {
    return new Pointer(this.ref.container.hash, this.classIdx)
  }


  get package (): WasmContainer {
    return this.ref.container
  }

  classAbi (): AbiClass {
    return this.ref.container.abi.exportedByIdx(this.classIdx).get().toAbiClass()
  }

  static isJigRef (obj: Object): boolean {
    // This is a little hack to avoid having issues when 2 different builds are used at the same time.
    return obj instanceof JigRef || obj.constructor.name === 'JigRef'
  }

  extractProps (): Uint8Array {
    const wasm = this.ref.container
    return wasm.lifter.lift(this.ref.ptr, this.ref.ty)
  }

  getPropValue (propName: string): ContainerRef {
    const container = this.ref.container
    const abiClass = container.abi.exportedByIdx(this.classIdx).get().toAbiClass()
    const field = abiClass.fieldByName(propName).get()
    const buf = container.mem.extract(this.ref.ptr.plus(field.offset), field.type.ownSize())
    return new ContainerRef(new WasmWord(buf), field.type, container)
  }
}
