import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable
} from '../internal.js'

/**
 * Load By Ref Instruction.
 * 
 * Loads an instance by the given Jig Ref.
 */
export class LoadByRefInstruction extends Instruction {
  jigRef: Uint8Array;

  constructor(jigRef: Uint8Array) {
    super(OpCode.LOADBYREF)
    this.jigRef = jigRef
  }
}

/**
 * Load Args Serializer object - implements the Serializable interface.
 */
export const LoadByRefArgsSerializer: Serializable<LoadByRefInstruction> = {
  read(buf: BufReader): LoadByRefInstruction {
    const jigRef = buf.readBytes(32)
    return new LoadByRefInstruction(jigRef)
  },

  write(buf: BufWriter, instruction: LoadByRefInstruction): BufWriter {
    buf.writeBytes(instruction.jigRef)
    return buf
  }
}
