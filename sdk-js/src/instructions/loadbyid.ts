import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable
} from '../internal.js'

/**
 * Load By Id Instruction.
 * 
 * Loads an instance by the given Jig Id.
 */
export class LoadByIdInstruction extends Instruction {
  jigId: Uint8Array;

  constructor(jigId: Uint8Array) {
    super(OpCode.LOADBYID)
    this.jigId = jigId
  }
}

/**
 * Load By Origin Args Serializer object - implements the Serializable interface.
 */
export const LoadByIdArgsSerializer: Serializable<LoadByIdInstruction> = {
  read(buf: BufReader): LoadByIdInstruction {
    const jigId = buf.readBytes(32)
    return new LoadByIdInstruction(jigId)
  },

  write(buf: BufWriter, instruction: LoadByIdInstruction): BufWriter {
    buf.writeBytes(instruction.jigId)
    return buf
  }
}
