import {WasmContainer} from './wasm-container.js';
import {Lock} from "./locks/lock.js";
import {Pointer} from "@aldea/core";
import {AbiClass} from "./memory/abi-helpers/abi-class.js";
import {WasmWord} from "./wasm-word.js";
import {AbiType} from "./memory/abi-helpers/abi-type.js";

export class ContainerRef {
  ptr: WasmWord
  ty: AbiType
  container: WasmContainer

  constructor (ptr: WasmWord, ty: AbiType, container: WasmContainer) {
    this.ptr = ptr
    this.ty = ty
    this.container = container
  }

  equals (ref: ContainerRef) {
    return this.container.id === ref.container.id &&
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
    return new Pointer(this.ref.container.id, this.classIdx)
  }

  // writeField (fieldName: string, propValue: any) {
  //   const abiNode = this.ref.container.abi.exportedByIdx(this.classIdx).get().toAbiClass()
  //   const fieldNode = abiNode.fieldByName(fieldName).get()
  //   const layout = getObjectMemLayout(abiNode.fields)
  //   const TypedArray = getTypedArrayForPtr(fieldNode.type)
  //   const mem32 = new TypedArray(this.ref.container.memory.buffer, this.ref.ptr)
  //   const {align, offset} = layout[fieldName]
  //
  //   mem32[offset >>> align] = this.ref.container.insertValue(propValue, fieldNode.type)
  // }

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
}
