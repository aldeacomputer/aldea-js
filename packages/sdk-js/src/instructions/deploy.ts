import {
  Instruction,
  OpCode
} from '../internal.js'

/**
 * Deploy Instruction.
 * 
 * Deploys a code bundle. The code bundle must be a map of filename => content.
 */
export class DeployInstruction extends Instruction {
  entry: string[];
  code: Map<string, string>;

  constructor(entry: string | string[], code: Map<string, string>) {
    super(OpCode.DEPLOY)
    this.entry = Array.isArray(entry) ? entry : [entry]
    this.code = code
  }
}
