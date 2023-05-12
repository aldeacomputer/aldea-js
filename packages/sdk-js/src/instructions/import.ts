import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable
} from '../internal.js'

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

/**
 * Import Args Serializer object - implements the Serializable interface.
 */
export const ImportArgsSerializer: Serializable<ImportInstruction> = {
  read(buf: BufReader): ImportInstruction {
    const pkgId = buf.readFixedBytes(32)
    return new ImportInstruction(pkgId)
  },

  write(buf: BufWriter, inst: ImportInstruction): BufWriter {
    buf.writeFixedBytes(inst.pkgId)
    return buf
  }
}
