import {ExecutionError} from "./errors.js";
import {JigRef} from "./jig-ref.js";
import {WasmInstance} from "./wasm-instance.js";
import {TypeNode} from "@aldea/compiler/abi";
import {InstructionRef} from "@aldea/sdk-js";

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

  abstract get asInstance(): WasmInstance

  abstract asJig(): JigRef

  get idx(): number {
    return this._idx
  }
}

export class WasmStatementResult extends StatementResult {
  private readonly _instance: WasmInstance;

  constructor(idx: number, instance: WasmInstance) {
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

  get asInstance(): WasmInstance {
    return this._instance;
  }
}

export class ValueStatementResult extends StatementResult {
  abiNode: TypeNode
  value: any
  wasm: WasmInstance

  constructor(idx: number, node: TypeNode, value: any, wasm: WasmInstance) {
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

  get asInstance(): WasmInstance {
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

  get asInstance(): WasmInstance {
    throw new ExecutionError('wrong index')
  }

  get value(): any {
    throw new ExecutionError('wrong index')
  }
}
