import {ExecutionError} from "./errors.js";
import {JigRef} from "./jig-ref.js";
import {WasmInstance} from "./wasm-instance.js";
import {TypeNode} from "@aldea/compiler/abi";

export abstract class StatementResult {
  abstract get abiNode(): TypeNode;

  abstract get value(): any;

  abstract get wasm(): WasmInstance;

  abstract get instance(): WasmInstance;

  abstract asJig(): JigRef;
}

export class WasmStatementResult extends StatementResult {
  private readonly _instance: WasmInstance;

  constructor(instance: WasmInstance) {
    super()
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

  get wasm(): WasmInstance {
    throw new ExecutionError('statement is not a value');
  }

  get instance(): WasmInstance {
    return this._instance;
  }
}

export class NullStatementResult extends StatementResult {
  get abiNode(): TypeNode {
    throw new Error('null')
  }

  asJig(): JigRef {
    throw new Error('null')
  }

  get instance(): WasmInstance {
    throw new Error('null')
  }

  get value(): any {
    throw new Error('null')
  }

  get wasm(): WasmInstance {
    throw new Error('null')
  }

}

export class ValueStatementResult extends StatementResult {
  abiNode: TypeNode
  value: any
  wasm: WasmInstance

  constructor(node: TypeNode, value: any, wasm: WasmInstance) {
    super()
    this.abiNode = node
    this.value = value
    this.wasm = wasm
  }

  asJig(): JigRef {
    if (this.value instanceof JigRef) {
      return this.value as JigRef
    } else {
      throw new ExecutionError(`${this.abiNode.name} is not a jig`)
    }
  }

  get instance(): WasmInstance {
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

  get instance(): WasmInstance {
    throw new ExecutionError('wrong index')
  }

  get value(): any {
    throw new ExecutionError('wrong index')
  }

  get wasm(): WasmInstance {
    throw new ExecutionError('wrong index')
  }
}
