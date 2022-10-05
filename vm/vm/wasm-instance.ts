import {CBOR, Sequence} from 'cbor-redux'
import {JigPointer, JigRef} from "./jig-ref.js";
import {WasmMemory} from "./wasm-memory.js";

function __liftString(memory: WebAssembly.Memory, pointer: number) {
  if (!pointer) return null;
  const
    end = pointer + new Uint32Array(memory.buffer)[pointer - 4 >>> 2] >>> 1,
    memoryU16 = new Uint16Array(memory.buffer);
  let
    start = pointer >>> 1,
    string = "";
  while (end - start > 1024) string += String.fromCharCode(...memoryU16.subarray(start, start += 1024));
  return string + String.fromCharCode(...memoryU16.subarray(start, end));
}

function __encodeArgs (args: any[]) {
  const seq = Sequence.from(args)
  return new Uint8Array(CBOR.encode(seq))
}

function __decodeArgs (data: Uint8Array): any[] {
  return CBOR.decode(data.buffer, null, {mode: "sequence"}).data
}

type MethodHandler = (origin: string, methodName: string, args: any[]) => Uint8Array
type CreateHandler = (moduleId: string, className: string, args: any[]) => JigRef
type AdoptHandler = (childOrigin: string) => void
type ReleaseHandler = (childOrigin: string, parentOrigin: string) => void

export class WasmInstance {
  id: string;
  private memory: WasmMemory;
  private methodHandler: MethodHandler;
  private createHandler: CreateHandler;
  private adoptHandler: AdoptHandler;
  private releaseHandler: ReleaseHandler;
  private module: WebAssembly.Module;
  private instance: WebAssembly.Instance;

  constructor (module: WebAssembly.Module, abi: any, id: string) {
    this.id = id
    const wasmMemory = new WebAssembly.Memory({initial: 1, maximum: 1})
    this.methodHandler = () => { throw new Error('handler not defined')}
    this.createHandler = () => { throw new Error('handler not defined')}
    this.adoptHandler = () => { throw new Error('handler not defined')}
    this.releaseHandler = () => { throw new Error('handler not defined')}
    const imports: any = {
      env: {
        memory: wasmMemory,
        abort: (messagePtr: number, fileNamePtr: number, lineNumber: number, columnNumber: number) => {
          const messageStr = this.memory.liftString(messagePtr);
          const fileNameStr = this.memory.liftString(fileNamePtr);

          (() => {
            // @external.js
            throw Error(`${messageStr} in ${fileNameStr}:${lineNumber}:${columnNumber}`);
          })();
        }
      },
      vm: {
        vm_call: (buffPointer: number) => {
          const argBuf = this.memory.liftBuffer(buffPointer)
          const [ origin, methodName, methodArgumentsBuff ] = __decodeArgs(argBuf)
          const args = __decodeArgs(methodArgumentsBuff)

          const resBuf = this.methodHandler(origin, methodName, args)
          return this.memory.lowerBuffer(resBuf)
        },
        vm_prop: () => {
          throw new Error()
        },
        vm_create: (buffPointer: number) => {
          const argBuf = this.memory.liftBuffer(buffPointer)
          const [ moduleName, className, methodArgumentsBuff ] = __decodeArgs(argBuf)
          const args = __decodeArgs(methodArgumentsBuff)
          const jigRef = this.createHandler(moduleName, className, args)
          const originBuff = __encodeArgs([jigRef.origin])

          return this.memory.lowerBuffer(originBuff)
        },
        vm_adopt: (buffPointer: number) => {
          const argBuf = this.memory.liftBuffer(buffPointer)
          const [ childOrigin ] = __decodeArgs(argBuf)
          this.adoptHandler(childOrigin)
        },
        vm_release: (buffPointer: number) => {
          const argBuf = this.memory.liftBuffer(buffPointer)
          const [childOrigin, parentRef] = __decodeArgs(argBuf)
          this.releaseHandler(childOrigin, parentRef)
        }
      }
    }
    this.module = module
    this.instance = new WebAssembly.Instance(this.module, imports)
    this.memory = new WasmMemory(this.instance)
  }

  onMethodCall (fn: MethodHandler) {
    this.methodHandler = fn
  }

  onCreate (fn: CreateHandler) {
    this.createHandler = fn
  }

  onAdopt (fn: AdoptHandler) {
    this.adoptHandler = fn
  }

  onRelease (fn: ReleaseHandler) {
    this.releaseHandler = fn
  }

  setUp () {}

  staticCall (className: string, methodName: string, args: any[]): number {
    const fnName = `${className}_${methodName}`
    if (!Object.keys(this.instance.exports).includes(fnName)) {
      throw new Error(`unknown function: ${fnName}`)
    }

    const argBuf = __encodeArgs(args)
    const argPointer = this.memory.lowerBuffer(argBuf)
    // const parse =  (data) => CBOR.decode(data.buffer, null, { mode: "sequence" })
    // console.log(parse(argBuf))
    const method = this.instance.exports[fnName] as Function;
    const resultPointer = method(argPointer)
    return resultPointer
  }

  createNew (className: string, args: any[]): JigPointer {
    const pointer = this.staticCall(className, 'constructor', args)
    const jigPointer = this.memory.liftInternalRef(pointer)
    return jigPointer
  }

  hidrate (className: string, frozenState: Uint8Array): any {
    const fnName = `${className}_deserialize`

    const argBuf = frozenState
    const argPointer = this.memory.lowerBuffer(argBuf)
    const deserializeMethod = this.instance.exports[fnName] as Function;
    let retBuf = this.memory.liftBuffer(deserializeMethod(argPointer))
    return __decodeArgs(retBuf)
  }

  instanceCall (ref: any, className: string, methodName: string, args: any[] = []): Uint8Array {
    // const fnName = `${className}$${methodName}`
    // if (!Object.keys(this.instance.exports).includes(fnName)) {
    //   throw new Error(`unknown function: ${fnName}`)
    // }
    //
    // args.unshift(ref)
    // let argBuf = __encodeArgs(args)
    // argBuf = this.__lowerBuffer(argBuf) || this.__notnull()
    // let retBuf = this.__liftBuffer(this.instance.exports[fnName](argBuf))
    return this.rawInstanceCall(ref, className, methodName, args)
  }

  rawInstanceCall (ref: any, className: string, methodName: string, args: any[] = []): Uint8Array {
    methodName = `${className}$${methodName}`
    if (!Object.keys(this.instance.exports).includes(methodName)) {
      throw new Error(`unknown function: ${methodName}`)
    }

    args.unshift(ref)
    let argBuf = __encodeArgs(args)
    const argPointer = this.memory.lowerBuffer(argBuf)
    const method = this.instance.exports[methodName] as Function;
    return this.memory.liftBuffer(method(argPointer))
  }
}
