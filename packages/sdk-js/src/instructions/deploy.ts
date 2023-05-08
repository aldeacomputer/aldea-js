import {
  BCS,
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable
} from '../internal.js'

/**
 * Deploy Instruction.
 * 
 * Deploys a code bundle. The code bundle must be a map of filename => content.
 */
export class DeployInstruction extends Instruction {
  pkgBuf: Uint8Array;

  constructor(pkgBuf: Uint8Array) {
    super(OpCode.DEPLOY)
    this.pkgBuf = pkgBuf
  }
}

/**
 * Deploy Args Serializer object - implements the Serializable interface.
 */
export const DeployArgsSerializer: Serializable<DeployInstruction> = {
  read(buf: BufReader): DeployInstruction {
    const pkgBuf = buf.readBytes(buf.remaining)
    return new DeployInstruction(pkgBuf)
  },

  write(buf: BufWriter, inst: DeployInstruction): BufWriter {
    buf.writeBytes(inst.pkgBuf)
    return buf
  }
}

