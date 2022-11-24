import { CBOR } from 'cbor-redux'
import {
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
  code: Map<string, string>;

  constructor(code: Map<string, string>) {
    super(OpCode.DEPLOY)
    this.code = code
  }
}

/**
 * Deploy Args Serializer object - implements the Serializable interface.
 */
export const DeployArgsSerializer: Serializable<DeployInstruction> = {
  read(buf: BufReader): DeployInstruction {
    const cborData = buf.readBytes(buf.remaining)

    const cborDataBuf = cborData.buffer.slice(cborData.byteOffset, cborData.byteOffset + cborData.byteLength)
    const code = CBOR.decode<Map<string, string>>(cborDataBuf, null, { dictionary: 'map' })
    
    return new DeployInstruction(code)
  },

  write(buf: BufWriter, inst: DeployInstruction): BufWriter {
    const cborData = CBOR.encode(inst.code)
    buf.writeBytes(new Uint8Array(cborData))
    return buf
  }
}

