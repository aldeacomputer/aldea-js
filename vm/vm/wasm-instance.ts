import {CBOR, Sequence} from 'cbor-redux'
import {JigRef} from "./jig-ref.js";
import {
  Abi, ArgNode,
  FieldKind, FieldNode,
  TypeNode,
  findClass, findField, findFunction, findMethod, findObject
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
import {base16, Pointer} from "@aldea/sdk-js";
import {TxExecution} from "./tx-execution.js";
import {ExecutionError} from "./errors.js";
import {ClassNode} from "@aldea/compiler/abi";

// enum AuthCheck {
//   CALL,     // 0 - can the caller call a method?
//   LOCK,     // 1 - can the called lock the jig?
// }

export enum LockType {
  FROZEN = -1,
  NONE,     // 0 - default, vm allows anyone to lock, but prevents function calls
  PUBKEY,   // 1 - vm requires valid signature to call function or change lock
  CALLER,   // 2 - vm requires parent is caller to call function or change lock
  ANYONE,   // 3 - can only be set in constructor, vm allows anyone to call function, but prevents lock change
}

// import {getObjectMemLayout, getTypedArrayConstructor, liftValue} from "@aldea/compiler/dist/vm/memory.js";

export type Prop = {
  node: TypeNode;
  mod: WasmInstance;
  value: any;
}

export type MethodResult = {
  node: TypeNode;
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

export function __encodeArgs (args: any[]): Uint8Array {
  const seq = Sequence.from(args)
  return new Uint8Array(CBOR.encode(seq))
}

function __decodeArgs (data: Uint8Array): any[] {
  return CBOR.decode(data.buffer, null, {mode: "sequence"}).data
}

const voidNode = { name: '_void', args: [] }

const utxoAbiNode = {
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
  id: Uint8Array;
  memory: WebAssembly.Memory;
  private _currentExec: TxExecution | null;

  private module: WebAssembly.Module;
  private instance: WebAssembly.Instance;
  abi: Abi;

  constructor (module: WebAssembly.Module, abi: Abi, id: Uint8Array) {
    this.id = id
    this.abi = abi
    abi.objects.push(utxoAbiNode)
    abi.objects.push(lockStateAbiNode)
    const wasmMemory = new WebAssembly.Memory({initial: 1, maximum: 1})
    this._currentExec = null

    const imports: any = {
      env: {
        memory: wasmMemory,
        abort: (messagePtr: number, fileNamePtr: number, lineNumber: number, columnNumber: number) => {
          const messageStr = liftString(this, messagePtr);
          const fileNameStr = liftString(this, fileNamePtr);

          (() => {
            // @external.js
            console.warn(`${messageStr} in ${fileNameStr}:${lineNumber}:${columnNumber}`)
            throw new ExecutionError(messageStr);
          })();
        }
      },
      vm: {
        vm_constructor: (jigPtr: number, classNamePtr: number): void => {
          const className = liftString(this, classNamePtr)
          this.currentExec.constructorHandler(this, jigPtr, className)
        },
        vm_local_call_start: (jigPtr: number, _fnNamePtr: number): void => {
          const fnName = liftString(this, _fnNamePtr)
          this.currentExec.localCallStartHandler(this, jigPtr, fnName)
        },
        vm_remote_authcheck: (originPtr: number, check: AuthCheck) => {
          const origin = liftBuffer(this, originPtr)
          return this.currentExec.remoteAuthCheckHandler(Pointer.fromBytes(origin), check)
        },
        vm_local_call_end: () => {
          this.currentExec.localCallEndtHandler()
        },
        vm_remote_call_i: (targetOriginPtr: number, fnNamePtr: number, argsPtr: number) => {
          const targetOriginArrBuf = liftBuffer(this, targetOriginPtr)
          const fnStr = liftString(this, fnNamePtr)
          const argBuf = liftBuffer(this, argsPtr)

          const [className, methodName] = fnStr.split('$')

          // const [] = fnStr.split('$')

          const methodResult = this.currentExec.remoteCallHandler(this, Pointer.fromBytes(targetOriginArrBuf), className, methodName, argBuf)
          return lowerValue(this, methodResult.node, methodResult.value)
        },
        vm_remote_call_s: (originPtr: number, fnNamePtr: number, argsPtr: number): number => {
          const moduleId = liftString(this, originPtr)
          const fnStr = liftString(this, fnNamePtr)
          const argBuf = liftBuffer(this, argsPtr)
          const result = this.currentExec.remoteStaticExecHandler(this, base16.decode(moduleId), fnStr, argBuf)
          return lowerValue(this, result.node, result.value)
        },

        vm_remote_prop: (targetOriginPtr: number, propNamePtr: number) => {
          const targetOrigBuf = liftBuffer(this, targetOriginPtr)
          const propStr = liftString(this, propNamePtr)
          const propName = propStr.split('.')[1]

          const prop = this.currentExec.getPropHandler(Pointer.fromBytes(targetOrigBuf), propName)
          return lowerValue(prop.mod, prop.node, prop.value)
        },
        vm_local_authcheck: (targetJigPtr: number, check: AuthCheck) => {
          return this.currentExec.localAuthCheckHandler(targetJigPtr, this, check)
        },
        vm_local_lock: (targetJigRefPtr: number, type: LockType, argsPtr: number): void => {
          const argBuf = liftBuffer(this, argsPtr)
          this.currentExec.localLockHandler(targetJigRefPtr, this, type, argBuf)
        },
        vm_local_state: (jigPtr: number): number => {
          const jigRef = this.currentExec.findUtxoHandler(this, jigPtr)
          const abiNode = findObject(this.abi, 'UtxoState', 'should be present')
          const utxo = {
            origin: jigRef.origin.toString(),
            location: 'currentlocation', // FIXME: real location,
            lock: {
              type: 1,
              data: new ArrayBuffer(0)
            }
          }
          return lowerObject(this, abiNode, utxo)
        },
        vm_remote_state: (originPtr: number): number => {
          const originBuff = liftBuffer(this, originPtr)
          const jigRef = this.currentExec.findRemoteUtxoHandler(originBuff)
          const utxo = {
            origin: jigRef.origin.toString(),
            location: jigRef, // FIXME: real location,
            lock: {
              type: jigRef.lock.typeNumber(),
              data: new ArrayBuffer(0)
            }
          }
          const abiNode = findObject(this.abi, 'UtxoState', 'should be present')
          return lowerObject(this, abiNode, utxo)
        },
        vm_remote_lock: (originPtr: number, type: LockType, argsPtr: number) => {
          const argBuf = liftBuffer(this, argsPtr)
          const originBuf = liftBuffer(this, originPtr)
          this.currentExec.remoteLockHandler(Pointer.fromBytes(originBuf), type, argBuf)
        }
      }
    }
    this.module = module
    this.instance = new WebAssembly.Instance(this.module, imports)
    const start = this.instance.exports._start as Function;
    start()
    this.memory = wasmMemory
  }

  get currentExec (): TxExecution {
    if (this._currentExec === null) { throw new Error('tx execution is not present')}
    return this._currentExec
  }

  setExecution (tx: TxExecution) {
    this._currentExec = tx
  }

  /**
   * TODO - Miguel to check
   * Expose the exports as need to access externall from memory functions
   * (for putting vals into stes/maps)
   */
  get exports(): WasmExports {
    return this.instance.exports as WasmExports
  }

  staticCall (className: string, methodName: string, args: any[]): MethodResult {
    const fnName = `${className}_${methodName}`
    const abiObj = findClass(this.abi, className, `unknown class: ${className}`)
    const method = findMethod(abiObj, methodName, `unknown method: ${methodName}`)

    const ptrs = method.args.map((argNode: ArgNode, i: number) => {
      return lowerValue(this, argNode.type, args[i])
    })

    const fn = this.instance.exports[fnName] as Function;
    const retPtr = fn(...ptrs)
    const retValue = methodName === 'constructor'
      ? new Internref(className, retPtr)
      : liftValue(this, method.rtype, retPtr)

    return {
      node: method.rtype ? method.rtype : voidNode,
      value: retValue,
      mod: this
    }
  }

  hidrate (classIdx: number, frozenState: Uint8Array): Internref {
    const rawState = __decodeArgs(frozenState)
    const objectNode = this.abi.exports[classIdx].code as ClassNode //findClass(, className, `unknown class ${className}`)
    const pointer = lowerObject(this, objectNode, rawState)
    return liftInternref(this, objectNode, pointer)
  }

  instanceCall (ref: JigRef, className: string, methodName: string, args: any[] = []): MethodResult {
    const fnName = `${className}$${methodName}`
    const abiObj = findClass(this.abi, className, `unknown export: ${className}`)
    const method = findMethod(abiObj, methodName, `unknown method: ${methodName}`)

    const ptrs = [
      lowerInternref(ref),
      ...method.args.map((argNode: ArgNode, i: number) => {
        return lowerValue(this, argNode.type, args[i])
      })
    ]

    const fn = this.instance.exports[fnName] as Function;
    const ptr = fn(...ptrs)
    const result = liftValue(this, method.rtype, ptr)
    return {
      mod: this,
      value: result,
      node: method.rtype ? method.rtype : voidNode
    }
  }

  getPropValue (ref: Internref, classIdx: number, fieldName: string): Prop {
    const objNode = this.abi.exports[classIdx].code // findClass(this.abi, classIdx, `unknown export: ${classIdx}`)
    const classNode = objNode as ClassNode
    const field = findField(classNode, fieldName, `unknown field: ${fieldName}`)

    const offsets = getObjectMemLayout(classNode)
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
    const abiFn = findFunction(this.abi, fnName, `unknown export: ${fnName}`)

    const ptrs = abiFn.args.map((argNode: ArgNode, i: number) => {
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

  extractState(ref: Internref, classIdx: number): Uint8Array {
    const abiObj = this.abi.exports[classIdx].code as ClassNode
    const liftedObject = liftObject(this, abiObj, ref.ptr)

    return __encodeArgs(
      abiObj.fields.map((field: FieldNode) => liftedObject[field.name])
    )
  }
}
