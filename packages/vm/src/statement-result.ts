import {ExecutionError} from "./errors.js";
import {ContainerRef} from "./jig-ref.js";
import {WasmContainer} from "./wasm-container.js";
import {AbiType} from "./memory/abi-helpers/abi-type.js";
import {WasmWord} from "./wasm-word.js";

export abstract class StatementResult {
  private _idx: number
  constructor(idx: number) {
    this._idx = idx
  }

  abstract asValue(): ContainerRef

  abstract asContainer(): WasmContainer

  get idx(): number {
    return this._idx
  }
}

export class WasmStatementResult extends StatementResult {
  private readonly _instance: WasmContainer;

  constructor(idx: number, instance: WasmContainer) {
    super(idx)
    this._instance = instance
  }

  asValue (): ContainerRef {
    throw new Error(`statement ${this.idx}  is not a value`)
  }

  asContainer(): WasmContainer {
    return this._instance;
  }
}

export class ValueStatementResult extends StatementResult {
  value: ContainerRef


  constructor(idx: number, ty: AbiType, ptr: WasmWord, wasm: WasmContainer) {
    super(idx)
    this.value = new ContainerRef(
        ptr,
        ty,
        wasm
    )
  }

  asValue (): ContainerRef {
    return this.value;
  }

  asContainer(): WasmContainer {
    throw new ExecutionError('statement is not a wasm instance');
  }
}

export class EmptyStatementResult extends StatementResult {
  asContainer (): WasmContainer {
    throw new Error('not a container');
  }

  asValue (): ContainerRef {
    throw new Error('not a value');
  }
}
