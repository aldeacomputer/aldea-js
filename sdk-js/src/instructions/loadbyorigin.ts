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
export class LoadByOriginInstruction extends Instruction {
  origin: Uint8Array;

  constructor(origin: Uint8Array) {
    super(OpCode.LOADBYORIGIN)
    this.origin = origin
  }
}

/**
 * Load By Origin Args Serializer object - implements the Serializable interface.
 */
export const LoadByOriginArgsSerializer: Serializable<LoadByOriginInstruction> = {
  read(buf: BufReader): LoadByOriginInstruction {
    const origin = buf.readBytes(32)
    return new LoadByOriginInstruction(origin)
  },

  write(buf: BufWriter, instruction: LoadByOriginInstruction): BufWriter {
    buf.writeBytes(instruction.origin)
    return buf
  }
}
