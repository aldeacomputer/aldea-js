import {Abi, TypeNode} from "@aldea/core/abi";
import {TxExecution} from "./tx-execution.js";
import {WasmPointer} from "./arg-reader.js";
import {AbiAccess} from "./memory/abi-helpers/abi-access.js";
import {NewMemory} from "./new-memory.js";
import {WasmWord} from "./wasm-word.js";
import {AbiType} from "./memory/abi-helpers/abi-type.js";
import {Option} from "./support/option.js";
import {NewLiftValue} from "./memory/new-lift-value.js";
import {NewLowerValue} from "./memory/new-lower-value.js";
import {base16, BCS, BufReader} from "@aldea/core";

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
  hash: Uint8Array;
  memory: WebAssembly.Memory;
  private _currentExec: Option<TxExecution>;

  private module: WebAssembly.Module;
  private instance: WebAssembly.Instance;
  abi: AbiAccess;
  private newMemory: NewMemory;
  lifter: NewLiftValue
  low: NewLowerValue

  constructor (module: WebAssembly.Module, abi: Abi, id: Uint8Array) {
    this.hash = id
    this.abi = new AbiAccess(abi)
    const wasmMemory = new WebAssembly.Memory({initial: 1, maximum: 1})
    this._currentExec = Option.none()
    this.newMemory = new NewMemory(wasmMemory)

    this.lifter = new NewLiftValue(this)
    this.low = new NewLowerValue(this, (p) => this._currentExec.get().getJigData(p))

    const imports: any = {
      env: {
        memory: wasmMemory,
        abort: (messagePtr: number, fileNamePtr: number, lineNumber: number, columnNumber: number) => {
          // const messageStr = this.liftString(messagePtr);
          // const fileNameStr = this.liftString(fileNamePtr);
          //
          // (() => {
          //   // @external.js
          //   console.warn(`${messageStr} in ${fileNameStr}:${lineNumber}:${columnNumber}`)
          //   throw new ExecutionError(messageStr);
          // })();
        }
      },
      vm: {
        jig_init: (): WasmPointer => {
          return this._currentExec.get().vmJigInit(this).toUInt()
        },
        jig_link: (jigPtr: number, rtid: number): WasmPointer => {

          return this._currentExec.get().vmJigLink(this, WasmWord.fromNumber(jigPtr), rtid).toUInt()
        },
        jig_authcheck: (callerOriginPtr: number, check: AuthCheck) => {
          // const callerOrigin = this.liftBuffer(callerOriginPtr)
          // return this.currentExec.remoteAuthCheckHandler(Pointer.fromBytes(callerOrigin), check)
        },
        call_method: (targetOriginPtr: number, fnNamePtr: number, argsPtr: number): number => {
          return this._currentExec.get()
            .vmCallMethod(
              this,
              WasmWord.fromNumber(targetOriginPtr),
              WasmWord.fromNumber(fnNamePtr),
              WasmWord.fromNumber(argsPtr)
            ).toUInt();
        },
        call_static: (originPtr: number, fnNamePtr: number, argsPtr: number): number => {
          // const moduleId = this.liftString(originPtr).split('_')[0]
          // const fnStr = this.liftString(fnNamePtr)
          // const argBuf = this.liftBuffer(argsPtr)
          //
          // const result = this.currentExec.remoteStaticExecHandler(this, base16.decode(moduleId), fnStr, argBuf)
          // return Number(this.insertValue(result.value, result.node))
          return 0
        },

        call_function: (pkgIdStrPtr: number, fnNamePtr: number, argsBufPtr: number): WasmPointer => {
          // const pkgId = this.liftString(pkgIdStrPtr)
          // const fnName = this.liftString(fnNamePtr)
          // const argsBuf = this.liftBuffer(argsBufPtr)
          // const targetPkg = this.currentExec.loadModule(base16.decode(pkgId))
          // const functionNode = targetPkg.abi.exportedByName(fnName).map(e => e.toAbiFunction()).get()
          // const result = targetPkg.functionCall(functionNode, this.liftArguments(argsBuf, functionNode.args))
          //
          // return this.insertValue(result.value, result.node)
          return 0
        },

        get_prop: (targetOriginPtr: number, propNamePtr: number): number => {
          return this._currentExec.get().vmGetProp(this, WasmWord.fromNumber(targetOriginPtr), WasmWord.fromNumber(propNamePtr)).toUInt()
        },
        remote_state: (originPtr: number): number => {
          // const originBuff = this.liftBuffer(originPtr)
          // const jigRef = this.currentExec.findRemoteUtxoHandler(originBuff)
          // const utxo = {
          //   origin: jigRef.origin.toString(),
          //   location: jigRef.latestLocation,
          //   lock: {
          //     type: jigRef.lock.typeNumber(),
          //     data: jigRef.lock.data()
          //   }
          // }
          // return Number(this.insertValue(utxo, outputTypeNode))
          return 0
        },
        jig_lock: (originPtr: number, type: number, argsPtr: number) => {
          // const argBuf = this.liftBuffer(argsPtr)
          // const originBuf = this.liftBuffer(originPtr)
          // this.currentExec.remoteLockHandler(Pointer.fromBytes(originBuf), type, argBuf)
          this._currentExec.get().vmJigLock(this, WasmWord.fromNumber(originPtr), type, WasmWord.fromNumber(argsPtr))
        },
        caller_typecheck: (rtIdToCheck: number, exact: boolean): boolean => {
          // const callerOrigin = this.currentExec.stackPreviousToTop()
          //
          // // If no caller then the caller is not of the given type.
          // if (!callerOrigin) {
          //   return false
          // }
          //
          // // Get caller ref
          // const callerRef = this.currentExec.getJigRefByOrigin(callerOrigin)
          // const callerAbi = callerRef.package.abi
          //
          // if (callerAbi.rtIdById(rtIdToCheck).isAbsent()) {
          //   return false
          // }
          // const rtIdNode = callerRef.package.abi.rtIdById(rtIdToCheck).get()
          // const type = emptyTn(rtIdNode.name)
          //
          // // check if it's an exported class
          // const exportedIndex = this.abi.exportedByName(type.name).get().toAbiClass().idx
          //
          // // Case when exported and exact, check is exactly the class
          // if (exportedIndex > -1 && exact) {
          //   return callerRef.classPtr().equals(new Pointer(this.id, exportedIndex))
          // }
          //
          // // Case when exported and not exact, check inheritance chain
          // if (exportedIndex > -1 && !exact) {
          //   // both classes belong to the same package. We check if caller is subclass of exportedIndex
          //   const callerClass = this.abi.exportedByIdx(callerRef.classIdx).get().toAbiClass()
          //   return callerClass.isSubclassByIndex(exportedIndex)
          // }
          //
          //
          // // check if imported class
          // this.abi.importedByName(type.name)
          // const maybeImportedIndex = this.abi.importedByName(type.name)
          // if (maybeImportedIndex.isAbsent()) {
          //   return false
          // }
          // const importedIndex = maybeImportedIndex.get().idx
          // const imported = this.abi.importedByIndex(importedIndex).get().toImportedClass()
          // const module = this.currentExec.getLoadedModule(imported.pkgId)
          // const externalExportedIndex = module.abi
          //     .exportedByName(type.name)
          //     .get()
          //     .idx
          // return callerRef.classPtr().equals(new Pointer(imported.pkgId, externalExportedIndex))
          return false
        },
        caller_outputcheck: (): boolean => {
          // const callerOrigin = this.currentExec.stackPreviousToTop()
          //
          // return !!callerOrigin
          return false
        },
        caller_output: (): WasmPointer => {
          // const callerOrigin = this.currentExec.stackPreviousToTop()
          // if (!callerOrigin) {
          //   throw new ExecutionError('caller function executed from top level')
          // }
          // const callerJig = this.currentExec.findJigByOrigin(callerOrigin)
          // const outputObject = callerJig.outputObject();
          // return this.insertValue(outputObject, outputTypeNode)
          return 0
        },
        caller_output_val: (keyPtr: number): WasmPointer => {
          // const callerOrigin = this.currentExec.stackPreviousToTop()
          // if (!callerOrigin) {
          //   throw new ExecutionError('caller function executed from top level')
          // }
          // const callerJig = this.currentExec.findJigByOrigin(callerOrigin)
          //
          // const propName = this.liftString(keyPtr)
          // let buf
          // if (propName === 'origin') {
          //   buf = callerJig.origin.toBytes()
          // } else
          // if (propName === 'location') {
          //   buf = callerJig.latestLocation.toBytes()
          // } else
          // if (propName === 'class') {
          //   buf = callerJig.classPtr().toBytes()
          // } else {
          //   throw new Error(`umnown caller property: ${propName}`)
          // }
          //
          // return this.insertValue(buf, arrayBufferTypeNode)
          return 0
        },
        constructor_local: (classNamePtr: number, argsPtr: number): WasmPointer => {
          // const className = this.liftString(classNamePtr)
          // // const classIdx = this.abi.classIdxByName(className)
          // const argsBuf = this.liftBuffer(argsPtr)
          // const methodNode = this.abi.exportedByName(className).get().toAbiClass().methodByName('constructor').get()
          // const args = this.liftArguments(argsBuf, methodNode.args)
          //
          // const instance = this.currentExec.instantiate(this, className, args)
          // // this.currentExec.pushToStack(this.currentExec.createNextOrigin())
          // // const instance = this.staticCall(className, 'constructor', args)
          // // this.currentExec.popFromStack()
          //
          // const jigRef = instance.value as JigRef
          //
          // return this.insertValue({
          //   origin: jigRef.origin.toBytes(),
          //   location: jigRef.origin.toBytes(),
          //   classPtr: jigRef.classPtr().toBytes(),
          //   lockType: jigRef.lock.typeNumber(),
          //   lockData: jigRef.lock.data(),
          // }, jigInitParamsTypeNode)
          return 0
        },
        constructor_remote: (pkgIdStrPtr: number, namePtr: number, argBufPtr: number): WasmPointer => {
          // const pkgIdStr = this.liftString(pkgIdStrPtr)
          // const className = this.liftString(namePtr)
          // const argBuf = this.liftBuffer(argBufPtr)
          // const pkg = this.currentExec.loadModule(base16.decode(pkgIdStr))
          //
          // const abiNode = pkg.abi.exportedByName(className).get().toAbiClass().methodByName('constructor').get()
          // const args = this.liftArguments(argBuf, abiNode.args)
          // const result = this.currentExec.instantiate(pkg, className, args)
          // const jigRef = result.value as JigRef
          //
          // return this.insertValue({
          //   origin: jigRef.origin.toBytes(),
          //   location: jigRef.origin.toBytes(),
          //   classPtr: jigRef.classPtr().toBytes(),
          //   lockType: jigRef.lock.typeNumber(),
          //   lockData: jigRef.lock.data(),
          // }, jigInitParamsTypeNode)
          return 0
        },
        proxy_link: () => {
        },
        debug_str: (strPtr: number): void => {
          const msg = this.lifter.lift(WasmWord.fromNumber(strPtr), AbiType.fromName('string'))
          const buf = Buffer.from(new BufReader(msg).readBytes())
          console.log(`debug [pkg=${this.id.slice(0, 6)}...]: ${buf.toString()}`)
        }
      }
    }
    this.module = module
    this.instance = new WebAssembly.Instance(this.module, imports)
    const start = this.instance.exports._start as Function;
    start()
    this.memory = wasmMemory
  }

  get id (): string {
    return base16.encode(this.hash)
  }

  get mem (): NewMemory {
    return this.newMemory
  }

  get currentExec (): Option<TxExecution> {
    return this._currentExec
  }

  setExecution (tx: TxExecution) {
    this._currentExec = Option.some(tx)
  }

  liftString(ptr: WasmWord): string {
    const buf = this.lifter.lift(ptr, AbiType.fromName('string'))
    return Buffer.from(new BufReader(buf).readBytes()).toString()
  }

  liftBuf(ptr: WasmWord): Uint8Array {
    const buf = this.lifter.lift(ptr, AbiType.fromName('ArrayBuffer'))
    return new BufReader(buf).readBytes()
  }

    // getPropValue (ref: Internref, classIdx: number, fieldName: string): Prop {
  //   const classNode = this.abi.exportedByIdx(classIdx).map(e => e.toAbiClass()).get()
  //   const field = classNode.fieldByName(fieldName).expect(new ExecutionError(`unknown field: ${fieldName}`))
  //
  //   const offsets = getObjectMemLayout(classNode.fields)
  //   const { offset, align } = offsets[field.name]
  //   const TypedArray = getTypedArrayForPtr(field.type)
  //   const ptr = new TypedArray(this.memory.buffer)[ref.ptr + offset >>> align]
  //   return this.extractValue(ptr, field.type)
  // }

  /**
   * The abi now exports plain functions - check this method is OK
   * The static call above should probably look like this too, no?
   */
  // functionCall (fnNode: AbiFunction, args: any[] = []): WasmValue {
  //   const ptrs = fnNode.args.map((argNode: ArgNode, i: number) => {
  //     const visitor = new LowerArgumentVisitor(this.abi, this, args[i])
  //     return visitor.travelFromType(argNode.type)
  //   })
  //
  //   const fn = this.instance.exports[fnNode.name] as Function;
  //   const ptr = fn(...ptrs)
  //   return this.extractCallResult(ptr, fnNode.rtype)
  // }

  // extractState(ref: Internref, classIdx: number): Uint8Array {
  //   const abiObj =  this.abi.exportedByIdx(classIdx).map(e => e.toAbiClass()).get()
  //   const visitor = new LiftJigStateVisitor(this.abi, this, ref.ptr)
  //   const lifted = visitor.visitExportedClass(
  //     abiObj,
  //     emptyTn(abiObj.name)
  //   )
  //   const bcs = new BCS(this.abi.abi)
  //   return bcs.encode(abiObj.name, abiObj.nativeFields().map((field: FieldNode) => lifted[field.name]))
  // }

  // liftArguments (argBuffer: Uint8Array, args: ArgNode[]): any[] {
  //   const argReader = new ArgReader(argBuffer)
  //   return args.map((n: ArgNode) => {
  //     const ptr = readType(argReader, n.type)
  //     const visitor = new LiftArgumentVisitor(this.abi, this, ptr)
  //     return visitor.travelFromType(n.type)
  //   })
  // }

  // liftBasicJig(value: Internref): any {
  //   return this.extractValue(value.ptr, emptyTn('__Jig')).value
  // }

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

  bcs (): BCS {
    return new BCS(this.abi.abi)
  }
}
