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
 * Imports code by the given origin.
 */
export class ImportInstruction extends Instruction {
  origin: Uint8Array;

  constructor(origin: Uint8Array) {
    super(OpCode.IMPORT)
    this.origin = origin
  }
}

/**
 * Import Args Serializer object - implements the Serializable interface.
 */
export const ImportArgsSerializer: Serializable<ImportInstruction> = {
  read(buf: BufReader): ImportInstruction {
    const origin = buf.readBytes(20)
    return new ImportInstruction(origin)
  },

  write(buf: BufWriter, inst: ImportInstruction): BufWriter {
    buf.writeBytes(inst.origin)
    return buf
  }
}
