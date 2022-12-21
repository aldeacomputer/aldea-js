import { Abi, ClassNode, validateAbi } from '@aldea/compiler/abi'
import { CBOR } from 'cbor-redux';
import { base16 } from './support/base.js'
import { blake3 } from './support/hash.js'

import {
  BufReader,
  BufWriter,
  Lock,
  LockSerializer,
  OutputResponse,
  Pointer,
  PointerSerializer,
  Serializable
} from './internal.js'

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
 * - `state`: CBOR encoded output state
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

  static fromJson(data: OutputResponse, abi?: Abi): Output {
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
      this.#classNode = undefined
    } else if (validateAbi(abi)) {
      this.#abi = abi
      const exp = abi.exports[this.classPtr.idx]
      if (exp) { this.#classNode = exp.code as ClassNode }
    }
  }

  get abi(): Abi | void {
    return this.#abi
  }

  get id(): string {
    return base16.encode(this.hash)
  }

  get hash(): Uint8Array {
    return blake3(this.toBytes())
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
    if (this.#classNode && typeof this.#props === 'undefined') {
      const stateSeq = CBOR.decode(this.stateBuf.buffer, null, { mode: 'sequence' })
      const props = this.#classNode.fields.reduce((props: any, f, i) => {
        props[f.name] = stateSeq.get(i)
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

  toJson(): OutputResponse {
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
    const stateLen = buf.readVarInt()
    const stateBuf = buf.readBytes(Number(stateLen))
    return new Output(origin, location, classPtr, lock, stateBuf)
  },

  write(buf: BufWriter, output: Output): BufWriter {
    buf.write<Pointer>(PointerSerializer, output.origin)
    buf.write<Pointer>(PointerSerializer, output.location)
    buf.write<Pointer>(PointerSerializer, output.classPtr)
    buf.write<Lock>(LockSerializer, output.lock)
    buf.writeVarInt(output.stateBuf.byteLength)
    buf.writeBytes(output.stateBuf)
    return buf
  }
}
