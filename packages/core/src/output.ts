import { Abi, ClassNode } from './abi/types.js'
import { AbiQuery } from './abi/query.js'
import { validateAbi } from './abi/validations.js'
import { base16 } from './support/base.js'
import { hash } from './support/blake3.js'

import {
  BCS,
  BufReader,
  BufWriter,
  Lock,
  LockInterface,
  LockSerializer,
  Pointer,
  PointerSerializer,
  Serializable
} from './internal.js'

/**
 * Raw Output interface
 */
export interface OutputInterface {
  id: string;
  origin: string;
  location: string;
  class: string;
  lock: LockInterface;
  state: string;
}

/**
 * Transaction Execution Output
 * 
 * When a transaction is executed it creates one or more outputs. An output
 * has the following fields:
 * 
 * - `origin`: a 36-byte pointer to the transaction the instance was first instantiated
 * - `location`: a 36-byte pointer to the transaction of the current state of the instance
 * - `class`: a 36-byte pointer to the package the class is found in
 * - `lock`: the Lock type and data
 * - `state`: BCS encoded output state
 * 
 * The Output class is a generic wrapper for any output, and provides a way to
 * access the parsed state as a JavaScript object.
 */
export class Output {
  origin: Pointer;
  location: Pointer;
  classPtr: Pointer;
  lock: Lock;
  stateBuf: Uint8Array;

  #abi?: Abi;
  #bcs?: BCS;
  #classNode?: ClassNode;
  #props: any;

  constructor(
    origin: Pointer,
    location: Pointer,
    classPtr: Pointer,
    lock: Lock,
    stateBuf: Uint8Array,
    abi?: Abi,
  ) {
    this.origin = origin
    this.location = location
    this.classPtr = classPtr
    this.lock = lock
    this.stateBuf = stateBuf
    if (typeof abi !== 'undefined') { this.abi = abi }
  }

  static fromBytes(bytes: Uint8Array, abi?: Abi): Output {
    if (!ArrayBuffer.isView(bytes)) {
      throw Error('The first argument to `Output.fromBytes()` must be a `Uint8Array`')
    }
    const buf = new BufReader(bytes)
    const output = buf.read<Output>(OutputSerializer)
    if (typeof abi !== 'undefined') { output.abi = abi }
    return output
  }

  static fromHex(hex: string, abi?: Abi): Output {
    let buff = base16.decode(hex)
    return this.fromBytes(buff, abi)
  }

  static fromJson(data: OutputInterface, abi?: Abi): Output {
    const output = new Output(
      Pointer.fromString(data.origin),
      Pointer.fromString(data.location),
      Pointer.fromString(data.class),
      Lock.fromJson(data.lock),
      base16.decode(data.state),
    )
    if (data.id !== output.id) {
      throw Error('invalid id. the given id does not match the computed id.')
    }
    if (typeof abi !== 'undefined') { output.abi = abi }
    return output
  }

  set abi(abi: Abi | void) {
    if (typeof abi === 'undefined') {
      this.#abi = undefined
      this.#bcs = undefined
      this.#classNode = undefined
    } else if (validateAbi(abi)) {
      this.#abi = abi
      this.#bcs = new BCS(abi)
      this.#classNode = new AbiQuery(abi).fromExports().byIndex(this.classPtr.idx).getClass()
    }
  }

  get abi(): Abi | void {
    return this.#abi
  }

  get id(): string {
    return base16.encode(this.hash)
  }

  get hash(): Uint8Array {
    return hash(this.toBytes())
  }

  get className(): string | void {
    if (this.#classNode) {
      return this.#classNode.name
    }
  }

  get classNode(): ClassNode | void {
    return this.#classNode
  }

  get props(): { [key: string]: any } | void {
    if (this.#bcs && this.#classNode && typeof this.#props === 'undefined') {
      const state = this.#bcs.decode(this.#classNode.name, this.stateBuf)
      const props = this.#classNode.fields.reduce((props: any, f, i) => {
        props[f.name] = state[i]
        return props
      }, {})
      this.#props = Object.freeze(props)
    }

    return this.#props
  }

  toBytes(): Uint8Array {
    const buf = new BufWriter()
    buf.write<Output>(OutputSerializer, this)
    return buf.data
  }

  toHex(): string {
    return base16.encode(this.toBytes())
  }

  toJson(): OutputInterface {
    return {
      id: this.id,
      origin: this.origin.toString(),
      location: this.location.toString(),
      class: this.classPtr.toString(),
      lock: this.lock.toJson(),
      state: base16.encode(this.stateBuf)
    }
  }
}

/**
 * Output Serializer object - implements the Serializable interface.
 */
export const OutputSerializer: Serializable<Output> = {
  read(buf: BufReader): Output {
    const origin = buf.read<Pointer>(PointerSerializer)
    const location = buf.read<Pointer>(PointerSerializer)
    const classPtr = buf.read<Pointer>(PointerSerializer)
    const lock = buf.read<Lock>(LockSerializer)
    const stateBuf = buf.readBytes()
    return new Output(origin, location, classPtr, lock, stateBuf)
  },

  write(buf: BufWriter, output: Output): BufWriter {
    buf.write<Pointer>(PointerSerializer, output.origin)
    buf.write<Pointer>(PointerSerializer, output.location)
    buf.write<Pointer>(PointerSerializer, output.classPtr)
    buf.write<Lock>(LockSerializer, output.lock)
    buf.writeBytes(output.stateBuf)
    return buf
  }
}
