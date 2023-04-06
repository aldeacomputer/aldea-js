import {Instruction, OpCode} from '../internal.js'

/**
 * Import Instruction.
 * 
 * Imports code by the given pakcage ID.
 */
export class ImportInstruction extends Instruction {
  pkgId: Uint8Array;

  constructor(pkgId: Uint8Array) {
    super(OpCode.IMPORT)
    this.pkgId = pkgId
  }
}

