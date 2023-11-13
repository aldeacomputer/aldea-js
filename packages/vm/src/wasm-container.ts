import {base16, BCS, Pointer} from "@aldea/core";
import {Abi, ArgNode, FieldNode, TypeNode} from "@aldea/core/abi";
import {JigRef} from "./jig-ref.js"
import {TxExecution} from "./tx-execution.js";
import {ExecutionError} from "./errors.js";
import {getObjectMemLayout, getTypedArrayForPtr, Internref} from "./memory.js";
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
  outputTypeNode
} from "./abi-helpers/well-known-abi-nodes.js";
import {AbiAccess} from "./abi-helpers/abi-access.js";
import {JigState} from "./jig-state.js";
import {LiftArgumentVisitor} from "./abi-helpers/lift-argument-visitor.js";
import {AbiFunction} from "./abi-helpers/abi-helpers/abi-function.js";
import {NewMemory} from "./new-memory.js";
import {WasmWord} from "./wasm-word.js";
import {AbiMethod} from "./abi-helpers/abi-helpers/abi-method.js";
import {AbiType} from "./abi-helpers/abi-helpers/abi-type.js";
import {Option} from "./support/option.js";

export enum LockType {
  FROZEN = -1,
  NONE,     // 0 - default, src allows anyone to lock, but prevents function calls
  PUBKEY,   // 1 - src requires valid signature to call function or change lock
  CALLER,   // 2 - src requires parent is caller to call function or change lock
  ANYONE,   // 3 - can only be set in constructor, src allows anyone to call function, but prevents lock change
}

export type Prop = {
  node: TypeNode;
  mod: WasmContainer;
  value: any;
}

export type WasmValue = {
  node: TypeNode;
  mod: WasmContainer;
  value: any;
}

export enum AuthCheck {
  CALL,
  LOCK
}

export interface WasmExports extends WebAssembly.Exports {
  [key: string]: (...args: WasmPointer[]) => number | void;
}

export class WasmContainer {
  id: Uint8Array;
  memory: WebAssembly.Memory;
  private _currentExec: TxExecution | null;

  private module: WebAssembly.Module;
  private instance: WebAssembly.Instance;
  abi: AbiAccess;
  private newMemory: NewMemory;

  constructor (module: WebAssembly.Module, abi: Abi, id: Uint8Array) {
    this.id = id
    this.abi = new AbiAccess(abi)
    const wasmMemory = new WebAssembly.Memory({initial: 1, maximum: 1})
    this._currentExec = null
    this.newMemory = new NewMemory(wasmMemory)

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
        jig_init: (): WasmPointer => {
          const nextOrigin = this.currentExec.createNextOrigin()

          return this.insertValue({
            origin: nextOrigin.toBytes(),
            location: nextOrigin.toBytes(),
            classPtr: new ArrayBuffer(0),
            lockType: LockType.NONE,
            lockData: new ArrayBuffer(0),
          }, jigInitParamsTypeNode)
        },
        jig_link: (jigPtr: number, rtid: number): WasmPointer =>  {
          const nextOrigin = this.currentExec.createNextOrigin()
          let rtIdNode = this.abi.rtIdById(rtid)
              .expect(new Error(`Runtime id "${rtid}" not found in ${base16.encode(this.id)}`))
          const abiClass = this.abi.exportedByName(rtIdNode.name).map(e => e.toAbiClass())
              .expect(new Error(`Class named "${rtIdNode.name}" not found in ${base16.encode(this.id)}`))

          this.currentExec.linkJig(new JigRef(
            new Internref(rtIdNode.name, jigPtr),
            abiClass.idx,
            this,
            nextOrigin,
            nextOrigin,
            new NoLock()
          ))

          return this.insertValue(new Pointer(this.id, abiClass.idx).toBytes(), emptyTn('ArrayBuffer'))
        },
        jig_authcheck: (callerOriginPtr: number, check: AuthCheck) => {
          const callerOrigin = this.liftBuffer(callerOriginPtr)
          return this.currentExec.remoteAuthCheckHandler(Pointer.fromBytes(callerOrigin), check)
        },
        call_method: (targetOriginPtr: number, fnNamePtr: number, argsPtr: number) => {
          const targetOriginArrBuf = this.liftBuffer(targetOriginPtr)
          const methodName = this.liftString(fnNamePtr)
          const argBuf = this.liftBuffer(argsPtr)

          const resultValue = this.currentExec.remoteCallHandler(this, Pointer.fromBytes(targetOriginArrBuf), methodName, argBuf)
          return this.insertValue(resultValue.value, resultValue.node)
        },
        call_static: (originPtr: number, fnNamePtr: number, argsPtr: number): number => {
          const moduleId = this.liftString(originPtr).split('_')[0]
          const fnStr = this.liftString(fnNamePtr)
          const argBuf = this.liftBuffer(argsPtr)

          const result = this.currentExec.remoteStaticExecHandler(this, base16.decode(moduleId), fnStr, argBuf)
          return Number(this.insertValue(result.value, result.node))
        },

        call_function: (pkgIdStrPtr: number, fnNamePtr: number, argsBufPtr: number): WasmPointer => {
          const pkgId = this.liftString(pkgIdStrPtr)
          const fnName = this.liftString(fnNamePtr)
          const argsBuf = this.liftBuffer(argsBufPtr)
          const targetPkg = this.currentExec.loadModule(base16.decode(pkgId))
          const functionNode = targetPkg.abi.exportedByName(fnName).map(e => e.toAbiFunction()).get()
          const result = targetPkg.functionCall(functionNode, this.liftArguments(argsBuf, functionNode.args))

          return this.insertValue(result.value, result.node)
        },

        get_prop: (targetOriginPtr: number, propNamePtr: number) => {
          const targetOrigBuf = this.liftBuffer(targetOriginPtr)
          const propStr = this.liftString(propNamePtr)
          const prop = this.currentExec.getPropHandler(Pointer.fromBytes(targetOrigBuf), propStr)
          return this.insertValue(prop.value, prop.node)
        },
        remote_state: (originPtr: number): number => {
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
        jig_lock: (originPtr: number, type: number, argsPtr: number) => {
          const argBuf = this.liftBuffer(argsPtr)
          const originBuf = this.liftBuffer(originPtr)
          this.currentExec.remoteLockHandler(Pointer.fromBytes(originBuf), type, argBuf)
        },
        caller_typecheck: (rtIdToCheck: number, exact: boolean): boolean => {
          const callerOrigin = this.currentExec.stackPreviousToTop()

          // If no caller then the caller is not of the given type.
          if (!callerOrigin) {
            return false
          }

          // Get caller ref
          const callerRef = this.currentExec.getJigRefByOrigin(callerOrigin)
          const callerAbi = callerRef.package.abi

          if (callerAbi.rtIdById(rtIdToCheck).isAbsent()) {
            return false
          }
          const rtIdNode = callerRef.package.abi.rtIdById(rtIdToCheck).get()
          const type = emptyTn(rtIdNode.name)

          // check if it's an exported class
          const exportedIndex = this.abi.exportedByName(type.name).get().toAbiClass().idx

          // Case when exported and exact, check is exactly the class
          if (exportedIndex > -1 && exact) {
            return callerRef.classPtr().equals(new Pointer(this.id, exportedIndex))
          }

          // Case when exported and not exact, check inheritance chain
          if (exportedIndex > -1 && !exact) {
            // both classes belong to the same package. We check if caller is subclass of exportedIndex
            const callerClass = this.abi.exportedByIdx(callerRef.classIdx).get().toAbiClass()
            return callerClass.isSubclassByIndex(exportedIndex)
          }


          // check if imported class
          this.abi.importedByName(type.name)
          const maybeImportedIndex = this.abi.importedByName(type.name)
          if (maybeImportedIndex.isAbsent()) {
            return false
          }
          const importedIndex = maybeImportedIndex.get().idx
          const imported = this.abi.importedByIndex(importedIndex).get().toImportedClass()
          const module = this.currentExec.getLoadedModule(imported.pkgId)
          const externalExportedIndex = module.abi
              .exportedByName(type.name)
              .get()
              .idx
          return callerRef.classPtr().equals(new Pointer(imported.pkgId, externalExportedIndex))
        },
        caller_outputcheck: (): boolean => {
          const callerOrigin = this.currentExec.stackPreviousToTop()

          return !!callerOrigin
        },
        caller_output: (): WasmPointer => {
          const callerOrigin = this.currentExec.stackPreviousToTop()
          if (!callerOrigin) {
            throw new ExecutionError('caller function executed from top level')
          }
          const callerJig = this.currentExec.findJigByOrigin(callerOrigin)
          const outputObject = callerJig.outputObject();
          return this.insertValue(outputObject, outputTypeNode)
        },
        caller_output_val: (keyPtr: number): WasmPointer => {
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
        constructor_local: (classNamePtr: number, argsPtr: number): WasmPointer => {
          const className = this.liftString(classNamePtr)
          // const classIdx = this.abi.classIdxByName(className)
          const argsBuf = this.liftBuffer(argsPtr)
          const methodNode = this.abi.exportedByName(className).get().toAbiClass().methodByName('constructor').get()
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
        constructor_remote: (pkgIdStrPtr: number, namePtr: number, argBufPtr: number): WasmPointer => {
          const pkgIdStr = this.liftString(pkgIdStrPtr)
          const className = this.liftString(namePtr)
          const argBuf = this.liftBuffer(argBufPtr)
          const pkg = this.currentExec.loadModule(base16.decode(pkgIdStr))

          const abiNode = pkg.abi.exportedByName(className).get().toAbiClass().methodByName('constructor').get()
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
        proxy_link: () => {},
        debug_str: (strPtr: number): void => {
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

  get mem(): NewMemory {
    return this.newMemory
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

  staticCall (method: AbiMethod, args: any[]): WasmValue {
    const fnName = `${method.className}_${method.name}`

    const ptrs = method.args.map((argNode: ArgNode, i: number) => {
      const visitor = new LowerArgumentVisitor(this.abi, this, args[i])
      return visitor.travelFromType(argNode.type)
    })

    const fn = this.instance.exports[fnName] as Function;
    const retPtr = fn(...ptrs)
    if (method.name === 'constructor') {
      return {
        node: emptyTn(method.className),
        value: new Internref(method.className, retPtr),
        mod: this
      }
    } else {
      return this.extractCallResult(retPtr, method.rtype)
    }
  }

  hydrate (classIdx: number, jigState: JigState): Internref {
    const jigClassNode = this.abi.exportedByIdx(classIdx).get().toAbiClass()
    const bcs = new BCS(this.abi.abi)

    const frozenState = jigState.stateBuf
    const rawState = [
      jigState.outputObject(),
      jigState.lockObject(),
      ...bcs.decode(jigClassNode.name, frozenState)
    ]

    const visitor = new LowerJigStateVisitor(this.abi, this, rawState)
    // TODO: totally broken
    const pointer = visitor.visitExportedClass(jigClassNode, emptyTn(`$${jigClassNode.name}`))
    return new Internref(jigClassNode.name, Number(pointer))
  }

  instanceCall(ref: JigRef, method: AbiMethod, args: any[] = []): WasmValue {
    const fnName = `${method.className}$${method.name}`

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
    const classNode = this.abi.exportedByIdx(classIdx).map(e => e.toAbiClass()).get()
    const field = classNode.fieldByName(fieldName).expect(new ExecutionError(`unknown field: ${fieldName}`))

    const offsets = getObjectMemLayout(classNode.fields)
    const { offset, align } = offsets[field.name]
    const TypedArray = getTypedArrayForPtr(field.type)
    const ptr = new TypedArray(this.memory.buffer)[ref.ptr + offset >>> align]
    return this.extractValue(ptr, field.type)
  }

  /**
   * The abi now exports plain functions - check this method is OK
   * The static call above should probably look like this too, no?
   */
  functionCall (fnNode: AbiFunction, args: any[] = []): WasmValue {
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
    const abiObj =  this.abi.exportedByIdx(classIdx).map(e => e.toAbiClass()).get()
    const visitor = new LiftJigStateVisitor(this.abi, this, ref.ptr)
    const lifted = visitor.visitExportedClass(
      abiObj,
      emptyTn(abiObj.name)
    )
    const bcs = new BCS(this.abi.abi)
    return bcs.encode(abiObj.name, abiObj.nativeFields().map((field: FieldNode) => lifted[field.name]))
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

  malloc (size: number, rtid: number): WasmWord {
    const __new = this.instance.exports.__new;
    if (!(__new instanceof Function)) {
      throw new Error('__new should be an exported function')
    }
    const ptrNumber = __new(size, rtid)
    return WasmWord.fromNumber(ptrNumber)
  }

  callFn (fnName: string, wasmWords: WasmWord[], abiTypes: AbiType[]): Option<WasmWord> {
    const fn = this.instance.exports[fnName];
    if (!(fn instanceof Function)) {
      throw new Error(`exported function "${fnName}" not found`)
    }
    const args = wasmWords.map((w, i) => w.toWasmArg(abiTypes[i]))
    const ret = fn(...args)
    return Option.fromNullable(ret).map(r => WasmWord.fromNumeric(r))
  }
}
