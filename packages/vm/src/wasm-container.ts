import {Abi} from "@aldea/core/abi";
import {TxExecution} from "./tx-execution.js";
import {AbiAccess} from "./memory/abi-helpers/abi-access.js";
import {MemoryProxy} from "./memory-proxy.js";
import {WasmWord} from "./wasm-word.js";
import {AbiType} from "./memory/abi-helpers/abi-type.js";
import {Option} from "./support/option.js";
import {ValueLifter} from "./memory/value-lifter.js";
import {LowerValue} from "./memory/lower-value.js";
import {base16, BCS, BufReader} from "@aldea/core";
import {ExecutionError} from "./errors.js";

export type WasmPointer = number | bigint

export enum AuthCheck {
  CALL,
  LOCK
}

export class WasmContainer {
  hash: Uint8Array;
  memory: WebAssembly.Memory;
  private _currentExec: Option<TxExecution>;

  private module: WebAssembly.Module;
  private instance: WebAssembly.Instance;
  abi: AbiAccess;
  private _mem: MemoryProxy;
  lifter: ValueLifter
  low: LowerValue

  constructor (module: WebAssembly.Module, abi: Abi, id: Uint8Array) {
    this.hash = id
    this.abi = new AbiAccess(abi)
    const wasmMemory = new WebAssembly.Memory({initial: 1, maximum: 1})
    this._currentExec = Option.none()
    this._mem = new MemoryProxy(wasmMemory, (size) => this.onDataMoved(size))

    this.lifter = new ValueLifter(this)
    this.low = new LowerValue(this, (p) => this._currentExec.get().getJigData(p))

    const imports: any = {
      env: {
        memory: wasmMemory,
        abort: (messagePtr: number, fileNamePtr: number, lineNumber: number, columnNumber: number) => {
          const messageStr = this.liftString(WasmWord.fromNumber(messagePtr));
          const fileNameStr = this.liftString(WasmWord.fromNumber(fileNamePtr));

          (() => {
            // @external.js
            console.warn(`${messageStr} in ${fileNameStr}:${lineNumber}:${columnNumber}`)
            throw new ExecutionError(messageStr);
          })();
        }
      },
      vm: {
        jig_init: (): WasmPointer => {
          return this._currentExec.get().vmJigInit(this).toUInt()
        },
        jig_link: (jigPtr: number, rtid: number): WasmPointer => {
          return this._currentExec.get().vmJigLink(this, WasmWord.fromNumber(jigPtr), rtid).toUInt()
        },
        jig_authcheck: (callerOriginPtr: number, check: AuthCheck): boolean => {
          return this._currentExec.get().vmJigAuthCheck(this, WasmWord.fromNumber(callerOriginPtr), check)
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
        call_function: (pkgIdStrPtr: number, fnNamePtr: number, argsBufPtr: number): WasmPointer => {
          return this._currentExec.get().vmCallFunction(
            this,
            WasmWord.fromNumber(pkgIdStrPtr),
            WasmWord.fromNumber(fnNamePtr),
            WasmWord.fromNumber(argsBufPtr)
          ).toUInt()
        },

        get_prop: (targetOriginPtr: number, propNamePtr: number): number => {
          return this._currentExec.get().vmGetProp(this, WasmWord.fromNumber(targetOriginPtr), WasmWord.fromNumber(propNamePtr)).toUInt()
        },
        jig_lock: (originPtr: number, type: number, argsPtr: number) => {
          this._currentExec.get().vmJigLock(this, WasmWord.fromNumber(originPtr), type, WasmWord.fromNumber(argsPtr))
        },
        caller_typecheck: (rtIdToCheck: number, exact: number): boolean => {
          return this._currentExec.get().vmCallerTypeCheck(
            this,
            rtIdToCheck,
            !!exact
          )
        },
        caller_outputcheck: (): boolean => {
          return this._currentExec.get().vmCallerOutputCheck()
        },
        caller_output: (): WasmPointer => {
          return this._currentExec.get().vmCallerOutput(this).toUInt()
        },
        caller_output_val: (keyPtr: number): WasmPointer => {
          return this._currentExec.get().vmCallerOutputVal(this, WasmWord.fromNumber(keyPtr)).toUInt()
        },
        constructor_local: (classNamePtr: number, argsPtr: number): WasmPointer => {
          return this._currentExec.get().vmConstructorLocal(
            this,
            WasmWord.fromNumber(classNamePtr),
            WasmWord.fromNumber(argsPtr)
          ).toUInt()
        },
        constructor_remote: (pkgIdStrPtr: number, namePtr: number, argBufPtr: number): WasmPointer => {
          return this._currentExec.get().vmConstructorRemote(
            this,
            WasmWord.fromNumber(pkgIdStrPtr),
            WasmWord.fromNumber(namePtr),
            WasmWord.fromNumber(argBufPtr)
          ).toUInt()
        },
        proxy_link: () => {},
        meter: (gasUsed: bigint) => {
          return this._currentExec.ifPresent(vm => vm.vmMeter(gasUsed))
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

  private onDataMoved(size: number): void {
    this._currentExec.get().onDatamoved(size)
  }

  get id (): string {
    return base16.encode(this.hash)
  }

  get mem (): MemoryProxy {
    return this._mem
  }

  get currentExec (): Option<TxExecution> {
    return this._currentExec
  }

  setExecution (tx: TxExecution) {
    this._currentExec = Option.some(tx)
  }

  clearExecution () {
    this._currentExec = Option.none()
  }

  liftString(ptr: WasmWord): string {
    const buf = this.lifter.lift(ptr, AbiType.fromName('string'))
    return Buffer.from(new BufReader(buf).readBytes()).toString()
  }

  liftBuf(ptr: WasmWord): Uint8Array {
    const buf = this.lifter.lift(ptr, AbiType.fromName('ArrayBuffer'))
    return new BufReader(buf).readBytes()
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

  bcs (): BCS {
    return new BCS(this.abi.abi)
  }
}
