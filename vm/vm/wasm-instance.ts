import {CBOR, Sequence} from 'cbor-redux'
import {JigRef} from "./jig-ref.js";
import {
  Abi,
  FieldKind,
  findExportedFunction,
  findExportedObject,
  findObjectField,
  findObjectMethod,
  findPlainObject,
  ObjectKind,
  TypeNode
} from "@aldea/compiler/abi";
import {
  getObjectMemLayout,
  getTypedArrayConstructor,
  Internref,
  liftBuffer,
  liftInternref,
  liftObject,
  liftString,
  liftValue,
  lowerInternref,
  lowerObject,
  lowerValue,
} from "./memory.js";

// enum AuthCheck {
//   CALL,     // 0 - can the caller call a method?
//   LOCK,     // 1 - can the called lock the jig?
// }

export enum LockType {
  NONE,     // 0 - default, vm allows anyone to lock, but prevents function calls
  PUBKEY,   // 1 - vm requires valid signature to call function or change lock
  PARENT,   // 2 - vm requires parent is caller to call function or change lock
  ANYONE,   // 3 - can only be set in constructor, vm allows anyone to call function, but prevents lock change
}

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

export enum AuthCheck {
  CALL,
  LOCK
}

/**
 * TODO - Miguel to check
 * Expose the exports as need to access externall from memory functions
 * (for putting vals into stes/maps)
 */
export interface WasmExports extends WebAssembly.Exports {
  [key: string]: (...args: number[]) => number | void;
}

function __encodeArgs (args: any[]): ArrayBuffer {
  const seq = Sequence.from(args)
  return CBOR.encode(seq)
}

function __decodeArgs (data: ArrayBuffer): any[] {
  return CBOR.decode(data, null, {mode: "sequence"}).data
}

type RemoteCallHandler = (callerInstance: WasmInstance, targetOrigin: string, className: string, methodName: string, argBuff: ArrayBuffer) => MethodResult
type RemoteStaticExecHandler = (srcModule: WasmInstance, targetModId: string, fnNane: string, argBuf: ArrayBuffer) => MethodResult
type GetPropHandler = (origin: string, propName: string) => Prop
type CreateHandler = (moduleId: string, className: string, args: any[]) => JigRef
type RemoteLockHandler = (childOrigin: string, type: LockType, extraArg: ArrayBuffer) => void
type ReleaseHandler = (childOrigin: string, parentOrigin: string) => void
type FindUtxoHandler = (jigPtr: number) => JigRef
type LocalLockHandler = (jigPtr: number, wasmInstance: WasmInstance, type: LockType, extraArg: ArrayBuffer) => void
type LocalCallStartHandler = (jigPtr: number, wasmInstance: WasmInstance) => void
type LocalCallEndtHandler = () => void
type AuthCheckHandler = (targetOrigin: string, check: AuthCheck) => boolean
type LocalAuthCheckHandler = (jigPtr: number, module: WasmInstance, check: AuthCheck) => boolean



const utxoAbiNode = {
  kind: ObjectKind.PLAIN,
  name: 'UtxoState',
  extends: null,
  fields: [
    {
      kind: FieldKind.PUBLIC,
      name: 'origin',
      type: {
        name: 'ArrayBuffer',
        args: []
      }
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'location',
      type: {
        name: 'ArrayBuffer',
        args: []
      }
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'motos',
      type: {
        name: 'u32',
        args: []
      }
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'lock',
      type: {
        name: 'LockState',
        args: []
      }
    }
  ],
  methods: []
}

const lockStateAbiNode = {
  kind: ObjectKind.PLAIN,
  name: 'LockState',
  extends: null,
  fields: [
    {
      kind: FieldKind.PUBLIC,
      name: 'type',
      type: {
        name: 'u8',
        args: []
      }
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'data',
      type: {
        name: 'ArrayBuffer',
        args: []
      }
    }
  ],
  methods: []
}

export class WasmInstance {
  id: string;
  memory: WebAssembly.Memory;
  private remoteCallHandler: RemoteCallHandler;
  private getPropHandler: GetPropHandler;
  private createHandler: CreateHandler;
  private remoteLockHandler: RemoteLockHandler;
  private releaseHandler: ReleaseHandler;
  private findUtxoHandler: FindUtxoHandler
  private localLockHandler: LocalLockHandler;
  private localCallStartHandler: LocalCallStartHandler;
  private localCallEndtHandler: LocalCallEndtHandler;
  private authCheckHandler: AuthCheckHandler;
  private localAuthCheckHandler: LocalAuthCheckHandler;
  private remoteStaticExecHandler: RemoteStaticExecHandler;
  private module: WebAssembly.Module;
  private instance: WebAssembly.Instance;
  abi: Abi;

  constructor (module: WebAssembly.Module, abi: Abi, id: string) {
    this.id = id
    this.abi = abi
    abi.objects.push(utxoAbiNode)
    abi.objects.push(lockStateAbiNode)
    const wasmMemory = new WebAssembly.Memory({initial: 1, maximum: 1})
    this.remoteCallHandler = () => { throw new Error('handler not defined')}
    this.getPropHandler = () => { throw new Error('handler not defined')}
    this.createHandler = () => { throw new Error('handler not defined')}
    this.remoteLockHandler = () => { throw new Error('handler not defined')}
    this.releaseHandler = () => { throw new Error('handler not defined')}
    this.findUtxoHandler = () => { throw new Error('handler not defined')}
    this.localLockHandler = () => { throw new Error('handler not defined')}
    this.localCallStartHandler = () => { throw new Error('handler not defined') }
    this.localCallEndtHandler = () => { throw new Error('handler not defined') }
    this.authCheckHandler = () => { throw new Error('handler not defined') }
    this.localAuthCheckHandler = () => { throw new Error('handler not defined') }
    this.remoteStaticExecHandler = () => { throw new Error('handler not defined')}

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
        vm_local_call_start: (jigPtr: number, _fnNamePtr: number): void => {
          this.localCallStartHandler(jigPtr, this)
        },
        vm_remote_authcheck: (originPtr: number, check: AuthCheck) => {
          const origin = liftBuffer(this, originPtr)
          return this.authCheckHandler(Buffer.from(origin).toString(), check)
          // if (check === AuthCheck.CALL) {
          //   const origin = liftBuffer(this, originPtr)
          //   return
          // } else {
          //   throw new Error('not implemented yet')
          // }
        },
        vm_local_call_end: () => {
          this.localCallEndtHandler()
        },
        vm_remote_call_i: (targetOriginPtr: number, fnNamePtr: number, argsPtr: number) => {
          const targetOriginArrBuf = liftBuffer(this, targetOriginPtr)
          const fnStr = liftString(this, fnNamePtr)
          const argBuf = liftBuffer(this, argsPtr)

          const [className, methodName] = fnStr.split('$')

          // const [] = fnStr.split('$')

          const methodResult = this.remoteCallHandler(this, Buffer.from(targetOriginArrBuf).toString(), className, methodName, argBuf)
          return lowerValue(this, methodResult.node, methodResult.value)
        },
        vm_remote_call_s: (originPtr: number, fnNamePtr: number, argsPtr: number): number => {
          const moduleId = liftString(this, originPtr)
          const fnStr = liftString(this, fnNamePtr)
          const argBuf = liftBuffer(this, argsPtr)

          const result = this.remoteStaticExecHandler(this, Buffer.from(moduleId).toString(), fnStr, argBuf)
          return lowerValue(this, result.node, result.value)
        },

        vm_remote_prop: (targetOriginPtr: number, propNamePtr: number) => {
          const rmtRefBuf = liftBuffer(this, targetOriginPtr)
          const propStr = liftString(this, propNamePtr)
          const propName = propStr.split('.')[1]

          const prop = this.getPropHandler(Buffer.from(rmtRefBuf).toString(), propName)
          return lowerValue(prop.mod, prop.node, prop.value)
        },
        vm_local_authcheck: (targetJigPtr: number, check: AuthCheck) => {
          return this.localAuthCheckHandler(targetJigPtr, this, check)
        },
        vm_local_lock: (targetJigRefPtr: number, type: LockType, argsPtr: number): void => {
          const argBuf = liftBuffer(this, argsPtr)
          this.localLockHandler(targetJigRefPtr, this, type, argBuf)
        },
        vm_local_state: (jigPtr: number): number => {
          const jigRef = this.findUtxoHandler(jigPtr)
          const abiNode = findPlainObject(this.abi, 'UtxoState', 'should be present')
          const utxo = {
            origin: jigRef.origin.toString(),
            location: 'currentlocation', // FIXME: real location,
            motos: 0,
            lock: {
              type: 1,
              data: new ArrayBuffer(0)
            }
          }
          return lowerObject(this, abiNode, utxo)
        },
        vm_remote_lock: (originPtr: number, type: LockType, argsPtr: number) => {
          const argBuf = liftBuffer(this, argsPtr)
          const origin = liftBuffer(this, originPtr)
          this.remoteLockHandler(Buffer.from(origin).toString(), type, argBuf)
        },
        vm_print: (msgPtr: number ) => {
          console.log(msgPtr)
        },
      }
    }
    this.module = module
    this.instance = new WebAssembly.Instance(this.module, imports)
    const start = this.instance.exports._start as Function;
    start()
    this.memory = wasmMemory
  }

  /**
   * TODO - Miguel to check
   * Expose the exports as need to access externall from memory functions
   * (for putting vals into stes/maps)
   */
  get exports(): WasmExports {
    return this.instance.exports as WasmExports
  }

  onGetProp (fn: GetPropHandler): void{
    this.getPropHandler = fn
  }

  onMethodCall (fn: RemoteCallHandler) {
    this.remoteCallHandler = fn
  }

  onCreate (fn: CreateHandler) {
    this.createHandler = fn
  }

  onRemoteLockHandler (fn: RemoteLockHandler) {
    this.remoteLockHandler = fn
  }

  onRelease (fn: ReleaseHandler) {
    this.releaseHandler = fn
  }

  onFindUtxo(fn: FindUtxoHandler) {
    this.findUtxoHandler = fn
  }

  onLocalLock(fn: LocalLockHandler) {
    this.localLockHandler = fn
  }

  onLocalCallStart (fn: LocalCallStartHandler) {
    this.localCallStartHandler = fn
  }

  onLocalCallEnd (fn: LocalCallEndtHandler) {
    this.localCallEndtHandler = fn
  }

  onAuthCheck (fn: AuthCheckHandler) {
    this.authCheckHandler = fn
  }

  onLocalAuthCheck (fn: LocalAuthCheckHandler) {
    this.localAuthCheckHandler = fn
  }

  onRemoteStaticExecHandler (fn: RemoteStaticExecHandler) {
    this.remoteStaticExecHandler = fn
  }

  staticCall (className: string, methodName: string, args: any[]): MethodResult {
    const fnName = `${className}_${methodName}`
    const abiObj = findExportedObject(this.abi, className, `unknown export: ${className}`)
    const method = findObjectMethod(abiObj, methodName, `unknown method: ${methodName}`)

    const ptrs = method.args.map((argNode, i) => {
      return lowerValue(this, argNode.type, args[i])
    })

    const fn = this.instance.exports[fnName] as Function;
    const retPtr = fn(...ptrs)
    const retValue = methodName === 'constructor'
      ? new Internref(className, retPtr)
      : liftValue(this, method.rtype, retPtr)

    return {
      node: method.rtype,
      value: retValue,
      mod: this
    }
  }

  createNew (className: string, args: any[]): Internref {
    const result = this.staticCall(className, 'constructor', args)
    return result.value
  }

  hidrate (className: string, frozenState: ArrayBuffer): Internref {
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
      lowerInternref(ref),
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
    const objNode = findExportedObject(this.abi, className, `unknown export: ${className}`)
    const field = findObjectField(objNode, fieldName, `unknown field: ${fieldName}`)

    const offsets = getObjectMemLayout(objNode)
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

  /**
   * TODO - Miguel to check
   * The abi now exports plain functions - check this method is OK
   * The static call above should probably look like this too, no?
   */
  functionCall (fnName: string, args: any[] = []): MethodResult {
    const abiFn = findExportedFunction(this.abi, fnName, `unknown export: ${fnName}`)

    const ptrs = abiFn.args.map((argNode, i) => {
      return lowerValue(this, argNode.type, args[i])
    })

    const fn = this.instance.exports[fnName] as Function;
    const ptr = fn(...ptrs)
    const result = liftValue(this, abiFn.rtype, ptr)

    return {
      mod: this,
      value: result,
      node: abiFn.rtype
    }
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

  extractState(ref: Internref, className: string): ArrayBuffer {
    const abiObj = findExportedObject(this.abi, className, 'not found')
    const liftedObject = liftObject(this, abiObj, ref.ptr)

    return __encodeArgs(
      abiObj.fields.map(field => liftedObject[field.name])
    )
  }
}
