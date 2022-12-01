import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable
} from '../internal.js'

/**
 * Load Instruction.
 * 
 * Loads an instance by the given location.
 */
export class LoadInstruction extends Instruction {
  location: Uint8Array;

  constructor(location: Uint8Array) {
    super(OpCode.LOAD)
    this.location = location
  }
}

/**
 * Load Args Serializer object - implements the Serializable interface.
 */
export const LoadArgsSerializer: Serializable<LoadInstruction> = {
  read(buf: BufReader): LoadInstruction {
    const location = buf.readBytes(36)
    return new LoadInstruction(location)
  },

  write(buf: BufWriter, instruction: LoadInstruction): BufWriter {
    buf.writeBytes(instruction.location)
    return buf
  }
}
