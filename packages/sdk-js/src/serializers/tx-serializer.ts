import {Serializable} from "../serializable.js";
import {BufReader} from "../buf-reader.js";
import {Instruction} from "../instruction.js";
import {BufWriter} from "../buf-writer.js";
import {Tx} from "../tx.js";
import {InstructionSerializer} from "./instruction-serializer.js";

/**
 * Tx Serializer object - implements the Serializable interface.
 */
export const TxSerializer: Serializable<Tx> = {
  read(buf: BufReader): Tx {
    const version = buf.readU16()
    const instructions = new Array<Instruction>(buf.readVarInt() as number)
    for (let i = 0; i < instructions.length; i++) {
      instructions[i] = buf.read<Instruction>(InstructionSerializer)
    }
    return new Tx(version, instructions)
  },

  write(buf: BufWriter, tx: Tx): BufWriter {
    buf.writeU16(tx.version)
    buf.writeVarInt(tx.instructions.length)
    for (let i = 0; i < tx.instructions.length; i++) {
      buf.write<Instruction>(InstructionSerializer, tx.instructions[i])
    }
    return buf
  }
}
