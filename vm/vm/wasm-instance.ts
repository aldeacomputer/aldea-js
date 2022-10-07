import {CBOR, Sequence} from 'cbor-redux'
import {JigRef} from "./jig-ref.js";
import {
  Abi,
  FieldNode,
  findExportedObject,
  findImportedObject,
  findObjectField,
  findObjectMethod,
  MethodKind,
  TypeNode,
  MethodNode
} from "@aldea/compiler/abi";
import {
  getObjectMemLayout,
  getTypedArrayConstructor,
  Internref,
  liftBuffer,
  liftInternref,
  liftString, liftValue,
  lowerInternref,
  lowerValue,
} from "./memory.js";
import {ArgReader, readType} from "./arg-reader.js";

// import {getObjectMemLayout, getTypedArrayConstructor, liftValue} from "@aldea/compiler/dist/vm/memory.js";

export type Prop = {
  node: TypeNode;
  mod: WasmInstance;
  value: any;
}

export type MethodResult = {
  node: TypeNode | null;
  mod: WasmInstance;
  value: any;
}

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

type MethodHandler = (origin: string, methodNode: MethodNode, args: any[]) => MethodResult
type GetPropHandler = (origin: string, propName: string) => Prop
type CreateHandler = (moduleId: string, className: string, args: any[]) => JigRef
type AdoptHandler = (childOrigin: string) => void
type ReleaseHandler = (childOrigin: string, parentOrigin: string) => void

export class WasmInstance {
  id: string;
  memory: WebAssembly.Memory;
  private methodHandler: MethodHandler;
  private getPropHandler: GetPropHandler;
  private createHandler: CreateHandler;
  private adoptHandler: AdoptHandler;
  private releaseHandler: ReleaseHandler;
  private module: WebAssembly.Module;
  private instance: WebAssembly.Instance;
  abi: Abi;

  constructor (module: WebAssembly.Module, abi: Abi, id: string) {
    this.id = id
    this.abi = abi
    const wasmMemory = new WebAssembly.Memory({initial: 1, maximum: 1})
    this.methodHandler = () => { throw new Error('handler not defined')}
    this.getPropHandler = () => { throw new Error('handler not defined')}
    this.createHandler = () => { throw new Error('handler not defined')}
    this.adoptHandler = () => { throw new Error('handler not defined')}
    this.releaseHandler = () => { throw new Error('handler not defined')}
    const imports: any = {
      env: {
        memory: wasmMemory,
        abort: (messagePtr: number, fileNamePtr: number, lineNumber: number, columnNumber: number) => {
          const messageStr = liftString(this, messagePtr);
          const fileNameStr = liftString(this, fileNamePtr);

          (() => {
            // @external.js
            throw Error(`${messageStr} in ${fileNameStr}:${lineNumber}:${columnNumber}`);
          })();
        }
      },
      vm: {
        vm_call: (rmtOriginPtr: number, rmtRefPtr: number, fnStrPtr: number, argBufPtr: number): number => {
          const rmtOrigin = liftString(this, rmtOriginPtr)
          const rmtRefBuf = liftBuffer(this, rmtRefPtr)
          const fnStr = liftString(this, fnStrPtr)
          const argBuf = liftBuffer(this, argBufPtr)

          const [className, methodName] = fnStr.split(/(?:_|\$)/)
          const obj = findImportedObject(this.abi, className, 'could not find object')
          const method = findObjectMethod(obj, methodName, 'could not find method')



          const argReader = new ArgReader(argBuf)
          const args = method.args.map((n: FieldNode) => {
            return readType(argReader, n.type)
          })

          // const rmtMod = this.getModule(rmtOrigin)
          // const val = rmtMod.callMethod(fnStr, vals)
          const methodResult = this.methodHandler(Buffer.from(rmtRefBuf).toString(), method, args)
          return lowerValue(this, methodResult.node, methodResult.value)
          // console.log(methodResult)
          // return lowerValue(mod, method.rtype, val)
        },
        vm_prop: (_srcptr: number, targetOriginPtr: number, propStrPtr: number): number => {
          // const rmtOrigin = liftString(this, rmtOriginPtr >>> 0)
          const rmtRefBuf = liftBuffer(this, targetOriginPtr)
          const propStr = liftString(this, propStrPtr)
          const propName = propStr.split('.')[1]

          const prop = this.getPropHandler(Buffer.from(rmtRefBuf).toString(), propName)
          return lowerValue(prop.mod, prop.node, prop.value)
        },
        vm_create: (buffPointer: number) => {
          throw new Error('not implemented')
        },
        vm_adopt: (buffPointer: number) => {
          throw new Error('not implemented')
        },
        vm_release: (buffPointer: number) => {
          throw new Error('not implemented')
        }
      }
    }
    this.module = module
    this.instance = new WebAssembly.Instance(this.module, imports)
    this.memory = wasmMemory
  }

  onGetProp (fn: GetPropHandler): void{
    this.getPropHandler = fn
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
    // const fnName = `${className}_${methodName}`
    // if (!Object.keys(this.instance.exports).includes(fnName)) {
    //   throw new Error(`unknown function: ${fnName}`)
    // }
    //
    // const argBuf = __encodeArgs(args)
    // const argPointer = lowerBuffer(this, argBuf)
    // // const parse =  (data) => CBOR.decode(data.buffer, null, { mode: "sequence" })
    // // console.log(parse(argBuf))
    // const method = this.instance.exports[fnName] as Function;
    // const resultPointer = method(argPointer)
    // return resultPointer

    const fnName = `${className}_${methodName}`
    const abiObj = findExportedObject(this.abi, className, `unknown export: ${className}`)
    const method = findObjectMethod(abiObj, methodName, `unknown method: ${methodName}`)

    const ptrs = [
      ...method.args.map((argNode, i) => {
        return lowerValue(this, argNode.type, args[i])
      })
    ]

    const fn = this.instance.exports[fnName] as Function;
    return fn(...ptrs)
  }

  createNew (className: string, args: any[]): Internref {
    const ptr = this.staticCall(className, 'constructor', args)
    const abiNode = findExportedObject(this.abi, className, 'should be present')
    const jigPointer = liftInternref(this, abiNode, ptr)
    return jigPointer
  }

  hidrate (className: string, frozenState: Uint8Array): any {
    throw new Error('not implemented')
    // const fnName = `${className}_deserialize`
    //
    // const argBuf = frozenState
    // const argPointer = this.memory.lowerBuffer(argBuf)
    // const deserializeMethod = this.instance.exports[fnName] as Function;
    // let retBuf = liftBuffer(this, deserializeMethod(argPointer))
    // return __decodeArgs(retBuf)
  }

  instanceCall (ref: JigRef, className: string, methodName: string, args: any[] = []): MethodResult {
    const fnName = `${className}$${methodName}`
    const abiObj = findExportedObject(this.abi, className, `unknown export: ${className}`)
    const method = findObjectMethod(abiObj, methodName, `unknown method: ${methodName}`)

    const ptrs = [
      lowerInternref(ref.ref),
      ...method.args.map((argNode, i) => {
        return lowerValue(this, argNode.type, args[i])
      })
    ]

    const fn = this.instance.exports[fnName] as Function;
    const ptr = fn(...ptrs)
    const result = liftValue(this, method.rtype, ptr)
    return {
      mod: this,
      value: result,
      node: method.rtype
    }
  }

  getPropValue (ref: Internref, className: string, fieldName: string): Prop {
    const obj = findExportedObject(this.abi, className, `unknown export: ${className}`)
    const field = findObjectField(obj, fieldName, `unknown field: ${fieldName}`)

    const offsets = getObjectMemLayout(obj)
    const { offset, align } = offsets[field.name]
    const TypedArray = getTypedArrayConstructor(field.type)
    const val = new TypedArray(this.memory.buffer)[ref.ptr + offset >>> align]

    return {
      mod: this,
      value: val,
      node: field.type
    }
    // return liftValue(this, field.type, val)
  }

  _executeExportedFunction (fnName: string, args: any[]): void {
    const [expName, methodName] = fnName.split(/(?:_|\$)/)
    const obj = findExportedObject(this.abi, expName, `unknown export: ${expName}`)
    const method = findObjectMethod(obj, methodName, `unknown method: ${methodName}`)

    if (method.kind === MethodKind.INSTANCE) {

    }

    const ptrs = method.args.map((arg, i) => {
      return lowerValue(this, arg.type, args[i])
    })
    // if (method.kind === MethodKind.INSTANCE) {
    //   if (!(args[0] instanceof Internref)) {
    //     throw new Error(`arg error: ${methodStr} arg[0] must be internref`)
    //   }
    //   ptrs.push(lowerInternref(args.shift()))
    // }

    const fn = this.instance.exports[fnName] as Function;
    fn(...ptrs)
    // return method.kind === MethodKind.CONSTRUCTOR ?
    //   liftInternref(this, obj, result >>> 0) :
    //   liftValue(this, method.rtype, result)
  }

  __new (a: number, b: number): number {
    const __new = this.instance.exports.__new as Function;
    return __new(a, b)
  }

  __pin (ptr: number): number {
    const __pin = this.instance.exports.__pin as Function;
    return __pin(ptr)
  }

  __unpin (ptr: number): number {
    const __unpin = this.instance.exports.__unpin as Function;
    return __unpin(ptr)
  }

  extractState(ref: Internref, className: string): Uint8Array {
    const abiObj = findExportedObject(this.abi, className, 'not found')
    return __encodeArgs(
      abiObj.fields.map((field) => {
        return this.getPropValue(ref, className,field.name).value
      }, [])
    )
  }
}
