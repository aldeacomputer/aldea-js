import { CBOR, Sequence } from 'cbor-redux'

function __liftString(mod, pointer) {
  if (!pointer) return null;
  const
    end = pointer + new Uint32Array(mod.exports.memory.buffer)[pointer - 4 >>> 2] >>> 1,
    memoryU16 = new Uint16Array(mod.exports.memory.buffer);
  let
    start = pointer >>> 1,
    string = "";
  while (end - start > 1024) string += String.fromCharCode(...memoryU16.subarray(start, start += 1024));
  return string + String.fromCharCode(...memoryU16.subarray(start, end));
}

function __encodeArgs (args) {
  if (args instanceof Uint8Array) { return args }
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
    this.releaseHandler = null
    this.imports = {
      env: {
        memory: this.memory,
        abort: (message, fileName, lineNumber, columnNumber) => {
          message = __liftString(this.instance, message >>> 0);
          fileName = __liftString(this.instance, fileName >>> 0);
          lineNumber = lineNumber >>> 0;
          columnNumber = columnNumber >>> 0;
          (() => {
            // @external.js
            throw Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`);
          })();
        }
      },
      vm: {
        vm_call: (buffPointer) => {
          const argBuf = this.__liftBuffer(buffPointer)
          const args = __decodeArgs(argBuf)
          const origin = args.get(0)
          const methodName = args.get(1)
          const methodArgumentsBuff = args.get(2)
          const argSeq = methodArgumentsBuff.length === 0 ? { data: [] } : CBOR.decode(methodArgumentsBuff.slice().buffer, null, { mode: "sequence" })

          const resBuf = this.methodHandler(origin, methodName, Array.from(argSeq.data))
          return this.__lowerBuffer(resBuf)
        },
        vm_prop: () => {
          throw new Error()
        },
        vm_create: (buffPointer) => {
          const argBuf = this.__liftBuffer(buffPointer)
          const args = __decodeArgs(argBuf)
          const moduleName = args.get(0)
          const className = args.get(1)
          const methodArgumentsBuff = args.get(2)
          const argSeq = methodArgumentsBuff.length === 0 ? { data: [] } : CBOR.decode(methodArgumentsBuff.slice().buffer, null, { mode: "sequence" })
          const jigRef = this.createHandler(moduleName, className, argSeq.data)
          const originBuff = __encodeArgs([jigRef.origin])

          return this.__lowerBuffer(originBuff)
        },
        vm_adopt: (buffPointer) => {
          const argBuf = this.__liftBuffer(buffPointer)
          const childOrigin = __decodeArgs(argBuf)
          this.adoptHandler(childOrigin)
        },
        vm_release: (buffPointer) => {
          const argBuf = this.__liftBuffer(buffPointer)
          const [childOrigin, parentRef] = __decodeArgs(argBuf).data
          this.releaseHandler(childOrigin, parentRef)
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

  onRelease (fn) {
    this.releaseHandler = fn
  }

  setUp () {}

  staticCall (className, methodName, args = []) {
    const fnName = `${className}_${methodName}`
    if (!Object.keys(this.instance.exports).includes(fnName)) {
      throw new Error(`unknown function: ${fnName}`)
    }

    const argBuf = __encodeArgs(args)
    const argPointer = this.__lowerBuffer(argBuf)
    // const parse =  (data) => CBOR.decode(data.buffer, null, { mode: "sequence" })
    // console.log(parse(argBuf))
    const resultPointer = this.instance.exports[fnName](argPointer) >>> 0
    let retBuf = this.__liftBuffer(resultPointer)
    return __decodeArgs(retBuf)
  }

  hidrate (className, frozenState) {
    const fnName = `${className}_deserialize`

    let argBuf = frozenState
    argBuf = this.__lowerBuffer(argBuf) || this.__notnull()
    let retBuf = this.__liftBuffer(this.instance.exports[fnName](argBuf))
    return __decodeArgs(retBuf)
  }

  instanceCall (ref, className, methodName, args = []) {
    const fnName = `${className}$${methodName}`
    if (!Object.keys(this.instance.exports).includes(fnName)) {
      throw new Error(`unknown function: ${fnName}`)
    }

    args.unshift(ref)
    let argBuf = __encodeArgs(args)
    argBuf = this.__lowerBuffer(argBuf) || this.__notnull()
    let retBuf = this.__liftBuffer(this.instance.exports[fnName](argBuf))
    return methodName === methodName ? retBuf : __decodeArgs(retBuf)
  }

  rawInstanceCall (ref, className, methodName, args = []) {
    methodName = `${className}$${methodName}`
    if (!Object.keys(this.instance.exports).includes(methodName)) {
      throw new Error(`unknown function: ${methodName}`)
    }

    args.unshift(ref)
    let argBuf = __encodeArgs(args)
    argBuf = this.__lowerBuffer(argBuf) || this.__notnull()
    return this.__liftBuffer(this.instance.exports[methodName](argBuf))
  }

  __lowerBuffer (values) {
    if (values == null) return 0;
    const instance = this.instance
    const
      length = values.length,
      buffer = instance.exports.__pin(instance.exports.__new(length, 0)),
      header = instance.exports.__new(12, 3),
      memoryU32 = new Uint32Array(this.memory.buffer);
    memoryU32[header + 0 >>> 2] = buffer;
    memoryU32[header + 4 >>> 2] = buffer;
    memoryU32[header + 8 >>> 2] = length << 0;
    new Uint8Array(this.memory.buffer, buffer, length).set(values);
    instance.exports.__unpin(buffer);
    return header;
  }

  __liftBuffer (pointer) {
    const mod = this.instance
    if (!pointer) return null;
    const memoryU32 = new Uint32Array(mod.exports.memory.buffer);
    return new Uint8Array(
      mod.exports.memory.buffer,
      memoryU32[pointer + 4 >>> 2],
      memoryU32[pointer + 8 >>> 2]
    ).slice();
  }

  __notnull () {
    throw new Error('should not be null')
  }
}
