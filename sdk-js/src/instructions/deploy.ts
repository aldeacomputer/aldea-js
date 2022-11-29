import { CBOR, Sequence } from 'cbor-redux'
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
  entry: string[];
  code: Map<string, string>;

  constructor(entry: string | string[], code: Map<string, string>) {
    super(OpCode.DEPLOY)
    this.entry = Array.isArray(entry) ? entry : [entry]
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
    const args = CBOR.decode(cborDataBuf, null, { mode: 'sequence', dictionary: 'map' })
    
    return new DeployInstruction(args.data[0], args.data[1])
  },

  write(buf: BufWriter, inst: DeployInstruction): BufWriter {
    const cborData = CBOR.encode(new Sequence([inst.entry.sort(), inst.code]))
    buf.writeBytes(new Uint8Array(cborData))
    return buf
  }
}

