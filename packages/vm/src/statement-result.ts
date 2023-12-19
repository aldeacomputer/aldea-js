import {ExecutionError} from "./errors.js";
import {ContainerRef} from "./jig-ref.js";
import {WasmContainer} from "./wasm-container.js";
import {AbiType} from "./memory/abi-helpers/abi-type.js";
import {WasmWord} from "./wasm-word.js";

/**
 * Every opcode execution returns a statement result.
 * This is the abstract class for all statement results.
 * @abstract
 */
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

/**
 * A statement result for an `IMPORT` or `DEPLOY` statements.
 * It contains a wasm instance.
 * @extends StatementResult
 */
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

/**
 * A statement result for:
 * - `LOAD`
 * - `LOAD_BY_ORIGIN`
 * - `NEW`
 * - `CALL`
 * - `EXEC`
 *
 * It contains a pointer to a value inside a wasm instance.
 * @extends StatementResult
 */
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

/**
 * Represents an empty statement result.
 * This is the result for executing the following opcodes:
 * - `LOCK`
 * - `FUND`
 * - `SIGN`
 * - `SIGN_TO`
 */
export class EmptyStatementResult extends StatementResult {
  asContainer (): WasmContainer {
    throw new Error('not a container');
  }

  asValue (): ContainerRef {
    throw new Error('not a value');
  }
}
