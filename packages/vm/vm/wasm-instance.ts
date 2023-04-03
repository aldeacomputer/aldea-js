import {JigRef} from "./jig-ref.js"
import {Abi, ArgNode, ClassNode, FieldNode, findField, TypeNode,} from "@aldea/compiler/abi";

import {base16, Pointer} from "@aldea/sdk-js";
import {TxExecution} from "./tx-execution.js";
import {ExecutionError} from "./errors.js";
import {getObjectMemLayout, getTypedArrayConstructor, Internref} from "./memory.js";
import {ArgReader, readType, WasmPointer} from "./arg-reader.js";
import {LiftValueVisitor} from "./abi-helpers/lift-value-visitor.js";
import {LowerValueVisitor} from "./abi-helpers/lower-value-visitor.js";
import {LiftJigStateVisitor} from "./abi-helpers/lift-jig-state-visitor.js";
import {LowerJigStateVisitor} from "./abi-helpers/lower-jig-state-visitor.js";
import {LowerArgumentVisitor} from "./abi-helpers/lower-argument-visitor.js";
import {NoLock} from "./locks/no-lock.js";
import {
  arrayBufferTypeNode,
  emptyTn,
  jigInitParamsTypeNode,
  outputTypeNode,
  voidNode,
} from "./abi-helpers/well-known-abi-nodes.js";
import {AbiAccess} from "./abi-helpers/abi-access.js";
import {JigState} from "./jig-state.js";
import {LiftArgumentVisitor} from "./abi-helpers/lift-argument-visitor.js";
import {decodeSequence, encodeSequence} from "./cbor.js";
import {MethodNodeWrapper} from "./abi-helpers/method-node-wrapper.js";
import {FunctionNode} from "@aldea/compiler/abi";

export enum LockType {
  FROZEN = -1,
  NONE,     // 0 - default, vm allows anyone to lock, but prevents function calls
  PUBKEY,   // 1 - vm requires valid signature to call function or change lock
  CALLER,   // 2 - vm requires parent is caller to call function or change lock
  ANYONE,   // 3 - can only be set in constructor, vm allows anyone to call function, but prevents lock change
}

export type Prop = {
  node: TypeNode;
  mod: WasmInstance;
  value: any;
}

export type WasmValue = {
  node: TypeNode;
  mod: WasmInstance;
  value: any;
}

export enum AuthCheck {
  CALL,
  LOCK
}

export interface WasmExports extends WebAssembly.Exports {
  [key: string]: (...args: WasmPointer[]) => number | void;
}

export class WasmInstance {
  id: Uint8Array;
  memory: WebAssembly.Memory;
  private _currentExec: TxExecution | null;

  private module: WebAssembly.Module;
  private instance: WebAssembly.Instance;
  abi: AbiAccess;

  constructor (module: WebAssembly.Module, abi: Abi, id: Uint8Array) {
    this.id = id
    this.abi = new AbiAccess(abi)
    const wasmMemory = new WebAssembly.Memory({initial: 1, maximum: 1})
    this._currentExec = null

    const imports: any = {
      env: {
        memory: wasmMemory,
        abort: (messagePtr: number, fileNamePtr: number, lineNumber: number, columnNumber: number) => {
          const messageStr = this.liftString(messagePtr);
          const fileNameStr = this.liftString(fileNamePtr);

          (() => {
            // @external.js
            console.warn(`${messageStr} in ${fileNameStr}:${lineNumber}:${columnNumber}`)
            throw new ExecutionError(messageStr);
          })();
        }
      },
      vm: {
        // vm_constructor_end: (jigPtr: number, classNamePtr: number): void => {
        //   const className = this.liftString(classNamePtr)
        //   this.currentExec.constructorHandler(this, jigPtr, className)
        // },
        vm_jig_init: (): WasmPointer => {
          const nextOrigin = this.currentExec.createNextOrigin()

          return this.insertValue({
            origin: nextOrigin.toBytes(),
            location: nextOrigin.toBytes(),
            classPtr: new ArrayBuffer(0),
            lockType: LockType.NONE,
            lockData: new ArrayBuffer(0),
          }, jigInitParamsTypeNode)
        },
        vm_jig_link: (jigPtr: number, rtid: number): WasmPointer =>  {
          const nextOrigin = this.currentExec.createNextOrigin()
          const className = this.abi.nameFromRtid(rtid)
          if (!className) {
            throw new Error('should exist')
          }

          const classIdx = this.abi.classIdxByName(className)

          this.currentExec.linkJig(new JigRef(
            new Internref(className, jigPtr),
            classIdx,
            this,
            nextOrigin,
            nextOrigin,
            new NoLock()
          ))

          return this.insertValue(new Pointer(this.id, classIdx).toBytes(), emptyTn('ArrayBuffer'))
        },
        // vm_local_call_start: (jigPtr: number, fnNamePtr: number): void => {
        //   const fnName = this.liftString(fnNamePtr)
        //   this.currentExec.localCallStartHandler(this, jigPtr, fnName)
        // },
        vm_jig_authcheck: (callerOriginPtr: number, check: AuthCheck) => {
          const callerOrigin = this.liftBuffer(callerOriginPtr)
          return this.currentExec.remoteAuthCheckHandler(Pointer.fromBytes(callerOrigin), check)
        },
        // vm_local_call_end: () => {
        //   this.currentExec.localCallEndtHandler()
        // },
        vm_call_method: (targetOriginPtr: number, fnNamePtr: number, argsPtr: number) => {
          const targetOriginArrBuf = this.liftBuffer(targetOriginPtr)
          const methodName = this.liftString(fnNamePtr)
          const argBuf = this.liftBuffer(argsPtr)

          const resultValue = this.currentExec.remoteCallHandler(this, Pointer.fromBytes(targetOriginArrBuf), methodName, argBuf)
          return this.insertValue(resultValue.value, resultValue.node)
        },
        vm_call_static: (originPtr: number, fnNamePtr: number, argsPtr: number): number => {
          const moduleId = this.liftString(originPtr).split('_')[0]
          const fnStr = this.liftString(fnNamePtr)
          const argBuf = this.liftBuffer(argsPtr)

          const result = this.currentExec.remoteStaticExecHandler(this, base16.decode(moduleId), fnStr, argBuf)
          return Number(this.insertValue(result.value, result.node))
        },

        vm_call_function: (pkgIdStrPtr: number, fnNamePtr: number, argsBufPtr: number): WasmPointer => {
          const pkgId = this.liftString(pkgIdStrPtr)
          const fnName = this.liftString(fnNamePtr)
          const argsBuf = this.liftBuffer(argsBufPtr)
          const targetPkg = this.currentExec.loadModule(base16.decode(pkgId))
          const functionNode = targetPkg.abi.functionByName(fnName)
          const result = targetPkg.functionCall(functionNode, this.liftArguments(argsBuf, functionNode.args))

          return this.insertValue(result.value, result.node)
        },

        vm_get_prop: (targetOriginPtr: number, propNamePtr: number) => {
          const targetOrigBuf = this.liftBuffer(targetOriginPtr)
          const propStr = this.liftString(propNamePtr)
          const prop = this.currentExec.getPropHandler(Pointer.fromBytes(targetOrigBuf), propStr)
          return this.insertValue(prop.value, prop.node)
        },
        vm_remote_state: (originPtr: number): number => {
          const originBuff = this.liftBuffer(originPtr)
          const jigRef = this.currentExec.findRemoteUtxoHandler(originBuff)
          const utxo = {
            origin: jigRef.origin.toString(),
            location: jigRef.latestLocation,
            lock: {
              type: jigRef.lock.typeNumber(),
              data: jigRef.lock.data()
            }
          }
          return Number(this.insertValue(utxo, outputTypeNode))
        },
        vm_jig_lock: (originPtr: number, type: number, argsPtr: number) => {
          const argBuf = this.liftBuffer(argsPtr)
          const originBuf = this.liftBuffer(originPtr)
          this.currentExec.remoteLockHandler(Pointer.fromBytes(originBuf), type, argBuf)
        },
        vm_caller_typecheck: (rtid: number, exact: boolean): boolean => {
          const callerOrigin = this.currentExec.stackPreviousToTop()

          if (!callerOrigin) {
            return false
          }

          const callerRef = this.currentExec.getJigRefByOrigin(callerOrigin)
          if (!callerRef.package.abi.rtidExists(rtid)) {
            return false
          }
          const type = callerRef.package.abi.typeFromRtid(rtid)


          // check if it's an exported class
          const exportedIndex = this.abi.findExportIndex(type.name)

          // Case when exported and exact, check is exactly the class
          if (exportedIndex > -1 && exact) {
            return callerRef.classPtr().equals(new Pointer(this.id, exportedIndex))
          }

          // Case when exported and not exact, check inheritance chain
          if (exportedIndex > -1 && !exact) {
            // both classes belong to the same package. We check if caller is subclass of exportedIndex
            return this.abi.isSubclassByIndex(callerRef.classIdx, exportedIndex)
            // return callerRef.classPtr().equals(new Pointer(this.id, exportedIndex))
          }


          // check if imported class
          const importedIndex = this.abi.findImportedIndex(type.name)
          if (importedIndex === -1) {
            return false
          }
          const imported = this.abi.importedByIndex(importedIndex)
          const module = this.currentExec.getLoadedModule(imported.pkg)
          const externalExportedIndex = module.abi.findExportIndex(type.name)
          return callerRef.classPtr().equals(new Pointer(imported.pkg, externalExportedIndex))
        },
        vm_caller_outputcheck: (): boolean => {
          const callerOrigin = this.currentExec.stackPreviousToTop()

          return !!callerOrigin
        },
        vm_caller_output: (): WasmPointer => {
          const callerOrigin = this.currentExec.stackPreviousToTop()
          if (!callerOrigin) {
            throw new ExecutionError('caller function executed from top level')
          }
          const callerJig = this.currentExec.findJigByOrigin(callerOrigin)
          const outputObject = callerJig.outputObject();
          return this.insertValue(outputObject, outputTypeNode)
        },
        vm_caller_output_val: (keyPtr: number): WasmPointer => {
          const callerOrigin = this.currentExec.stackPreviousToTop()
          if (!callerOrigin) {
            throw new ExecutionError('caller function executed from top level')
          }
          const callerJig = this.currentExec.findJigByOrigin(callerOrigin)

          const propName = this.liftString(keyPtr)
          let buf
          if (propName === 'origin') {
            buf = callerJig.origin.toBytes()
          } else
          if (propName === 'location') {
            buf = callerJig.latestLocation.toBytes()
          } else
          if (propName === 'class') {
            buf = callerJig.classPtr().toBytes()
          } else {
            throw new Error(`umnown caller property: ${propName}`)
          }

          return this.insertValue(buf, arrayBufferTypeNode)
        },
        vm_constructor_local: (classNamePtr: number, argsPtr: number): WasmPointer => {
          const className = this.liftString(classNamePtr)
          // const classIdx = this.abi.classIdxByName(className)
          const argsBuf = this.liftBuffer(argsPtr)
          const methodNode = this.abi.classByName(className).methodByName('constructor')
          const args = this.liftArguments(argsBuf, methodNode.args)

          const instance = this.currentExec.instantiate(this, className, args)
          // this.currentExec.pushToStack(this.currentExec.createNextOrigin())
          // const instance = this.staticCall(className, 'constructor', args)
          // this.currentExec.popFromStack()

          const jigRef = instance.value as JigRef

          return this.insertValue({
            origin: jigRef.origin.toBytes(),
            location: jigRef.origin.toBytes(),
            classPtr: jigRef.classPtr().toBytes(),
            lockType: jigRef.lock.typeNumber(),
            lockData: jigRef.lock.data(),
          }, jigInitParamsTypeNode)
        },
        vm_constructor_remote: (pkgIdStrPtr: number, namePtr: number, argBufPtr: number): WasmPointer => {
          const pkgIdStr = this.liftString(pkgIdStrPtr)
          const className = this.liftString(namePtr)
          const argBuf = this.liftBuffer(argBufPtr)
          const pkg = this.currentExec.loadModule(base16.decode(pkgIdStr))

          const abiNode = pkg.abi.classByName(className).methodByName('constructor')
          const args = this.liftArguments(argBuf, abiNode.args)
          const result = this.currentExec.instantiate(pkg, className, args)
          const jigRef = result.value as JigRef

          return this.insertValue({
            origin: jigRef.origin.toBytes(),
            location: jigRef.origin.toBytes(),
            classPtr: jigRef.classPtr().toBytes(),
            lockType: jigRef.lock.typeNumber(),
            lockData: jigRef.lock.data(),
          }, jigInitParamsTypeNode)
        },
        vm_debug_str: (strPtr: number): void => {
          const msg = this.liftString(strPtr)
          console.log(`debug [pkg=${base16.encode(this.id).slice(0, 6)}...]: ${msg}`)
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

  staticCall (method: MethodNodeWrapper, args: any[]): WasmValue {
    const fnName = `${method.className()}_${method.name}`

    const ptrs = method.args.map((argNode: ArgNode, i: number) => {
      const visitor = new LowerArgumentVisitor(this.abi, this, args[i])
      return visitor.travelFromType(argNode.type)
    })

    const fn = this.instance.exports[fnName] as Function;
    const retPtr = fn(...ptrs)
    if (method.name === 'constructor') {
      return {
        node: method.rtype ? method.rtype : voidNode,
        value: new Internref(method.className(), retPtr),
        mod: this
      }
    } else {
      return this.extractCallResult(retPtr, method.rtype)
    }
  }

  hidrate (classIdx: number, jigState: JigState): Internref {
    const frozenState = jigState.stateBuf
    const rawState = [
      jigState.outputObject(),
      jigState.lockObject(),
      ...decodeSequence(frozenState)
    ]
    const objectNode = this.abi.classByIndex(classIdx)
    const visitor = new LowerJigStateVisitor(this.abi, this, rawState)
    const pointer = visitor.visitPlainObject(objectNode, emptyTn(`$${objectNode.name}`))
    return new Internref(objectNode.name, Number(pointer))
  }

  instanceCall(ref: JigRef, method: MethodNodeWrapper, args: any[] = []): WasmValue {
    const fnName = `${method.className()}$${method.name}`

    const ptrs = [
      ref.ref.ptr,
      ...method.args.map((argNode: ArgNode, i: number) => {
        const visitor = new LowerArgumentVisitor(this.abi, this, args[i])
        return visitor.travelFromType(argNode.type)
      })
    ]

    const fn = this.instance.exports[fnName] as Function;
    const ptr = fn(...ptrs)
    // this.memMgr.liftValue(this, method.rtype, ptr)
    return this.extractCallResult(ptr, method.rtype)
  }

  getPropValue (ref: Internref, classIdx: number, fieldName: string): Prop {
    const objNode = this.abi.classByIndex(classIdx)
    const classNode = objNode as ClassNode
    const field = findField(classNode, fieldName, `unknown field: ${fieldName}`)

    const offsets = getObjectMemLayout(classNode)
    const { offset, align } = offsets[field.name]
    const TypedArray = getTypedArrayConstructor(field.type)
    const ptr = new TypedArray(this.memory.buffer)[ref.ptr + offset >>> align]
    return this.extractValue(ptr, field.type)
  }

  /**
   * TODO - Miguel to check
   * The abi now exports plain functions - check this method is OK
   * The static call above should probably look like this too, no?
   */
  functionCall (fnNode: FunctionNode, args: any[] = []): WasmValue {
    const ptrs = fnNode.args.map((argNode: ArgNode, i: number) => {
      const visitor = new LowerArgumentVisitor(this.abi, this, args[i])
      return visitor.travelFromType(argNode.type)
    })

    const fn = this.instance.exports[fnNode.name] as Function;
    const ptr = fn(...ptrs)
    return this.extractCallResult(ptr, fnNode.rtype)
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
    const abiObj =  this.abi.classByIndex(classIdx)
    const visitor = new LiftJigStateVisitor(this.abi, this, ref.ptr)
    const lifted = visitor.visitPlainObject(
      abiObj,
      emptyTn(abiObj.name)
    )
    return encodeSequence(
      abiObj.nativeFields().map((field: FieldNode) => lifted[field.name])
    )
  }

  extractValue(ptr: WasmPointer, type: TypeNode | null): WasmValue {
    if (type === null) {
      type = emptyTn('void')
    }
    const visitor = new LiftValueVisitor(this.abi, this, ptr)
    const value = visitor.travelFromType(type)

    return {
      mod: this,
      value,
      node: type
    }
  }

  private extractCallResult (ptr: WasmPointer, type: TypeNode | null): WasmValue {
    if (type === null) {
      type = emptyTn('void')
    }
    const visitor = new LiftArgumentVisitor(this.abi, this, ptr)
    const value = visitor.travelFromType(type)

    return {
      mod: this,
      value,
      node: type
    }
  }

  insertValue(value: any, type: TypeNode): WasmPointer {
    const visitor = new LowerValueVisitor(this.abi, this, value)
    return visitor.travelFromType(type)
  }

  private liftString(ptr: number): string {
    const visitor = new LiftValueVisitor(this.abi, this, ptr)
    return visitor.visitString()
  }

  private liftBuffer(ptr: number): Uint8Array {
    const visitor = new LiftValueVisitor(this.abi, this, ptr)
    return visitor.visitArrayBuffer()
  }

  liftArguments (argBuffer: Uint8Array, args: ArgNode[]): any[] {
    const argReader = new ArgReader(argBuffer)
    return args.map((n: ArgNode) => {
      const ptr = readType(argReader, n.type)
      const visitor = new LiftArgumentVisitor(this.abi, this, ptr)
      return visitor.travelFromType(n.type)
    })
  }

  liftBasicJig(value: Internref): any {
    return this.extractValue(value.ptr, emptyTn('__Jig')).value
  }
}
