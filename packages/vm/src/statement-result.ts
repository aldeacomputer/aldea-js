import {InstructionRef} from "@aldea/core";
import {TypeNode} from "@aldea/core/abi";
import {ExecutionError} from "./errors.js";
import {JigRef} from "./jig-ref.js";
import {WasmContainer} from "./wasm-container.js";

export function isInstructionRef(obj: Object): boolean {
  // This is a little hack to avoid having issues when 2 different builds are used at the same time.
  return obj.constructor.name === 'InstructionRef' || obj instanceof InstructionRef
}

export abstract class StatementResult {
  private _idx: number
  constructor(idx: number) {
    this._idx = idx
  }

  abstract get abiNode(): TypeNode

  abstract get value(): any

  abstract get asInstance(): WasmContainer

  abstract asJig(): JigRef

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

  get abiNode(): TypeNode {
    throw new ExecutionError('statement is not a value');
  }

  asJig(): JigRef {
    throw new ExecutionError('statement is not a jig');
  }

  get value(): any {
    throw new ExecutionError('statement is not a value');
  }

  get asInstance(): WasmContainer {
    return this._instance;
  }
}

export class ValueStatementResult extends StatementResult {
  abiNode: TypeNode
  value: any
  wasm: WasmContainer

  constructor(idx: number, node: TypeNode, value: any, wasm: WasmContainer) {
    super(idx)
    this.abiNode = node
    this.value = value
    this.wasm = wasm
  }

  asJig(): JigRef {
    if (JigRef.isJigRef(this.value)) {
      return this.value as JigRef
    } else {
      throw new ExecutionError(`${this.abiNode.name} is not a jig`)
    }
  }

  get asInstance(): WasmContainer {
    throw new ExecutionError('statement is not a wasm instance');
  }
}

export class EmptyStatementResult extends StatementResult {
  get abiNode(): TypeNode {
    throw new ExecutionError('wrong index')
  }

  asJig(): JigRef {
    throw new ExecutionError('wrong index')
  }

  get asInstance(): WasmContainer {
    throw new ExecutionError('wrong index')
  }

  get value(): any {
    throw new ExecutionError('wrong index')
  }
}
