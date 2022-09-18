import { CBOR, Sequence } from 'cbor-redux'

function __encodeArgs (args) {
  if (args instanceof Uint8Array) {
    return args
  }
  const seq = Sequence.from(args)
  return new Uint8Array(CBOR.encode(seq))
}

function __decodeArgs (data) {
  const seq = CBOR.decode(data.buffer, null, { mode: "sequence" })
  if (seq instanceof Sequence && seq.size === 1) {
    return seq.get(0)
  }
  return seq
}

export class WasmInstance {
  constructor (module, id) {
    this.id = id
    this.memory = new WebAssembly.Memory({ initial: 1, maximum: 1 })
    this.methodHandler = null
    this.createHandler = null
    this.adoptHandler = null
    this.imports = {
      env: {
        memory: this.memory, abort: (e) => {
          throw new Error(`abort was called: ${e}`)
        }
      },
      $aldea: {
        callMethod: (buffPointer) => {
          const argBuf = this.__liftTypedArray(Uint8Array, buffPointer >>> 0)
          const args = __decodeArgs(argBuf)
          const origin = args.get(0)
          const methodName = args.get(1)
          const methodArgumentsBuff = args.get(2)
          const argSeq = methodArgumentsBuff.length === 0 ? { data: [] } : CBOR.decode(methodArgumentsBuff.slice().buffer, null, { mode: "sequence" })

          const resBuf = this.methodHandler(origin, methodName, Array.from(argSeq.data))
          return this.__lowerTypedArray(Uint8Array, 3, 0, resBuf)
        },
        newInstance: (buffPointer) => {
          const argBuf = this.__liftTypedArray(Uint8Array, buffPointer >>> 0)
          const args = __decodeArgs(argBuf)
          const moduleName = args.get(0)
          const methodArgumentsBuff = args.get(1)
          const argSeq = methodArgumentsBuff.length === 0 ? { data: [] } : CBOR.decode(methodArgumentsBuff.slice().buffer, null, { mode: "sequence" })
          const jigRef = this.createHandler(moduleName, argSeq.data)
          const originBuff = __encodeArgs([jigRef.origin])

          return this.__lowerTypedArray(Uint8Array, 3, 0, originBuff)
        },
        adoptJig: (buffPointer) => {
          const argBuf = this.__liftTypedArray(Uint8Array, buffPointer >>> 0)
          const childOrigin = __decodeArgs(argBuf)
          this.adoptHandler(childOrigin)
        }
      }
    }
    this.module = module
    this.instance = new WebAssembly.Instance(this.module, this.imports)
  }

  onMethodCall (fn) {
    this.methodHandler = fn
  }

  onCreate (fn) {
    this.createHandler = fn
  }

  onAdopt (fn) {
    this.adoptHandler = fn
  }

  setUp () {}

  staticCall (fnName, args = []) {
    fnName = '$_' + fnName
    if (!Object.keys(this.instance.exports).includes(fnName)) {
      throw new Error(`unknown function: ${fnName}`)
    }

    let argBuf = __encodeArgs(args)
    argBuf = this.__lowerTypedArray(Uint8Array, 3, 0, argBuf) || __notnull()
    // const parse =  (data) => CBOR.decode(data.buffer, null, { mode: "sequence" })
    // console.log(parse(argBuf))
    const resultPointer = this.instance.exports[fnName](argBuf) >>> 0
    let retBuf = this.__liftTypedArray(Uint8Array, resultPointer)
    return __decodeArgs(retBuf)
  }

  hidrate (frozenState) {
    const fnName = '$_parse'

    let argBuf = frozenState
    argBuf = this.__lowerTypedArray(Uint8Array, 3, 0, argBuf) || __notnull()
    let retBuf = this.__liftTypedArray(Uint8Array, this.instance.exports[fnName](argBuf) >>> 0)
    return __decodeArgs(retBuf)
  }

  instanceCall (ref, methodName, args = []) {
    methodName = '$$' + methodName
    if (!Object.keys(this.instance.exports).includes(methodName)) {
      throw new Error(`unknown function: ${methodName}`)
    }

    args.unshift(ref)
    let argBuf = __encodeArgs(args)
    argBuf = this.__lowerTypedArray(Uint8Array, 3, 0, argBuf) || this.__notnull()
    let retBuf = this.__liftTypedArray(Uint8Array, this.instance.exports[methodName](argBuf) >>> 0)
    return methodName === '$$serialize' ? retBuf : __decodeArgs(retBuf)
  }

  rawInstanceCall (ref, methodName, args = []) {
    methodName = '$$' + methodName
    if (!Object.keys(this.instance.exports).includes(methodName)) {
      throw new Error(`unknown function: ${methodName}`)
    }

    args.unshift(ref)
    let argBuf = __encodeArgs(args)
    argBuf = this.__lowerTypedArray(Uint8Array, 3, 0, argBuf) || this.__notnull()
    return this.__liftTypedArray(Uint8Array, this.instance.exports[methodName](argBuf) >>> 0)
  }

  __lowerTypedArray (constructor, id, align, values) {
    if (values == null) return 0
    const
      length = values.length,
      buffer = this.instance.exports.__pin(this.instance.exports.__new(length << align, 0)) >>> 0,
      header = this.instance.exports.__new(12, id) >>> 0,
      memoryU32 = new Uint32Array(this.memory.buffer)
    memoryU32[header + 0 >>> 2] = buffer
    memoryU32[header + 4 >>> 2] = buffer
    memoryU32[header + 8 >>> 2] = length << align
    new constructor(this.memory.buffer, buffer, length).set(values)
    this.instance.exports.__unpin(buffer)
    return header
  }

  __liftTypedArray (constructor, pointer) {
    if (!pointer) return null
    const memoryU32 = new Uint32Array(this.memory.buffer)
    return new constructor(
      this.memory.buffer,
      memoryU32[pointer + 4 >>> 2],
      memoryU32[pointer + 8 >>> 2] / constructor.BYTES_PER_ELEMENT
    ).slice()
  }

  __notnull () {
    throw new Error('should not be null')
  }
}
