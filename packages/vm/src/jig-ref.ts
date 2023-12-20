import {WasmContainer} from './wasm-container.js';
import {Lock} from "./locks/lock.js";
import {Pointer} from "@aldea/core";
import {AbiClass} from "./memory/abi-helpers/abi-class.js";
import {WasmWord} from "./wasm-word.js";
import {AbiType} from "./memory/abi-helpers/abi-type.js";

/**
 * A reference to a value inside a wasm instance.
 */
export class ContainerRef {
  // Pointer to the value.
  ptr: WasmWord
  // Type of the value
  ty: AbiType
  // Container holding the value
  container: WasmContainer

  /**
   * @param {WasmWord} ptr - The pointer value.
   * @param {AbiType} ty - The ABI type.
   * @param {WasmContainer} container - The container object.
   */
  constructor (ptr: WasmWord, ty: AbiType, container: WasmContainer) {
    this.ptr = ptr
    this.ty = ty
    this.container = container
  }

  /**
   * Lifts the data from the container memory. Returns the data encoded in binary.
   *
   * @returns {Uint8Array} - The lifted data.
   */
  lift (): Uint8Array {
    return this.container.lifter.lift(this.ptr, this.ty)
  }

  /**
   * Compars if 2 values are the same. It compares for identity inside the container.
   * this means that an object duplicated in memory is condered different by this method.
   * (compares pointers, not objects)
   * @param ref
   */
  equals (ref: ContainerRef) {
    return this.container.hash === ref.container.hash &&
        this.ptr.equals(ref.ptr)
  }
}

/**
 * Class representing a live Jig Reference.
 */
export class JigRef {
  ref: ContainerRef
  classIdx: number;
  origin: Pointer;
  latestLocation: Pointer;
  lock: Lock;
  readonly isNew: boolean;

  /**
   * @param {ContainerRef} ref - The ContainerRef object.
   * @param {number} classIdx - The index of the class.
   * @param {Pointer} origin - The origin Pointer object.
   * @param {Pointer} latestLocation - The latestLocation Pointer object.
   * @param {Lock} lock - The Lock object.
   * @param {boolean} isNew - A boolean indicating if the instance is new.
   */
  constructor (ref: ContainerRef, classIdx: number, origin: Pointer, latestLocation: Pointer, lock: Lock, isNew: boolean) {
    this.ref = ref
    this.classIdx = classIdx
    this.origin = origin
    this.latestLocation = latestLocation
    this.lock = lock
    this.isNew = isNew
  }

  /**
   * Changes the lock of the jig.
   *
   * @param {Lock} newLock - The new lock to be set.
   * @returns {void}
   */
  changeLock (newLock: Lock) {
    const container = this.ref.container
    const lockTy = AbiType.fromName('Lock');
    const ptr = container.low.lower(newLock.serialize(this.origin.toBytes()), lockTy)
    container.mem.write(this.ref.ptr.plus(4), ptr.serialize(lockTy))
    this.lock = newLock
  }

  /**
   * Name of the jig's class.
   * @return {string} The name of the class.
   */
  className (): string {
    return this.classAbi().name
  }

  /**
   * Return a Pointer identifying this jig class.
   *
   * @returns {Pointer} - The new Pointer instance.
   */
  classPtr (): Pointer {
    return new Pointer(this.ref.container.hash, this.classIdx)
  }

  /**
   * Get the package where the jig is contained.
   *
   * @returns {WasmContainer} The package of the WasmContainer.
   */
  get package (): WasmContainer {
    return this.ref.container
  }

  /**
   * Retrieves the Abi Class Node for the jig referenced.
   *
   * @returns {AbiClass} The AbiClass object for the specified class index.
   */
  classAbi (): AbiClass {
    return this.ref.container.abi.exportedByIdx(this.classIdx).get().toAbiClass()
  }

  /**
   * Extracts the entire state of the jig.
   *
   * @returns {Uint8Array} - The extracted properties as a Uint8Array.
   */
  extractProps (): Uint8Array {
    const wasm = this.ref.container
    return wasm.lifter.lift(this.ref.ptr, this.ref.ty)
  }

  /**
   * Retrieves the value of a property from the container.
   *
   * @param {string} propName - The name of the property to retrieve.
   *
   * @return {ContainerRef} - The container reference containing the property value.
   */
  getPropValue (propName: string): ContainerRef {
    const container = this.ref.container
    const abiClass = container.abi.exportedByIdx(this.classIdx).get().toAbiClass()
    const field = abiClass.fieldByName(propName).get()
    const buf = container.mem.extract(this.ref.ptr.plus(field.offset), field.type.ownSize())
    return new ContainerRef(new WasmWord(buf), field.type, container)
  }
}
