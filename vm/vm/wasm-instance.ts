import {CBOR, Sequence} from 'cbor-redux'
import {JigRef} from "./jig-ref.js";
import {
  Abi,
  FieldNode,
  findExportedObject,
  findImportedObject,
  findObjectField,
  findObjectMethod,
  MethodNode,
  TypeNode
} from "@aldea/compiler/abi";
import {
  getObjectMemLayout,
  getTypedArrayConstructor,
  Internref,
  liftBuffer,
  liftInternref,
  liftString,
  liftValue,
  lowerInternref,
  lowerObject,
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
        vm_local_call_start: () => {

        },
        vm_local_call_end: () => {},
        vm_remote_call_i: (targetOriginPtr: number, fnNamePtr: number, argsPtr: number): number => {
          const targetOriginArrBuf = liftBuffer(this, targetOriginPtr)
          const fnStr = liftString(this, fnNamePtr)
          const argBuf = liftBuffer(this, argsPtr)

          const [className, methodName] = fnStr.split('_')
          const obj = findImportedObject(this.abi, className, 'could not find object')
          const method = findObjectMethod(obj, methodName, 'could not find method')



          const argReader = new ArgReader(argBuf)
          const args = method.args.map((n: FieldNode) => {
            return readType(argReader, n.type)
          })

          const methodResult = this.methodHandler(Buffer.from(targetOriginArrBuf).toString(), method, args)
          return lowerValue(this, methodResult.node, methodResult.value)
        },
        vm_remote_call_s: () => {},
        vm_remote_prop: (targetOriginPtr: number, propNamePtr: number): number => {
          const rmtRefBuf = liftBuffer(this, targetOriginPtr)
          const propStr = liftString(this, propNamePtr)
          const propName = propStr.split('.')[1]

          const prop = this.getPropHandler(Buffer.from(rmtRefBuf).toString(), propName)
          return lowerValue(prop.mod, prop.node, prop.value)
        },
        vm_local_authcheck: () => {},
        vm_local_lock: () => {
          console.log('holu')
        },
        vm_local_state: () => {
          console.log('holu')
        },
        vm_remote_lock: () => {
          console.log('holu')
        },
        vm_print: (msgPtr: number ) => {
          // const buf = liftBuffer(this, msgPtr)
          // console.log(Buffer.from(buf).toString())
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
    return liftInternref(this, abiNode, ptr)
  }

  hidrate (className: string, frozenState: Uint8Array): Internref {
    const rawState = __decodeArgs(frozenState)
    const objectNode = findExportedObject(this.abi, className, `unknown class ${className}`)
    const pointer = lowerObject(this, objectNode, rawState)
    return liftInternref(this, objectNode, pointer)
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
