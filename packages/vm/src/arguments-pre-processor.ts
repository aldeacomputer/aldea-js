import {BufReader, BufWriter} from "@aldea/core";
import {AbiType} from "./memory/abi-helpers/abi-type.js";
import {TxExecution} from "./tx-execution.js";
import {AbiAccess} from "./memory/abi-helpers/abi-access.js";

import {AbiArg} from "./memory/abi-helpers/abi-arg.js";

/**
 * Aldea transactions include arguments with indexes pointing to previous parts of the transaction.
 * This class is in charge or solving and de referencing thos indexes.
 */
export class ArgumentsPreProcessor {
  exec: TxExecution
  private abi: AbiAccess;

  constructor (exec: TxExecution, abi: AbiAccess) {
    this.exec = exec
    this.abi = abi
  }

  /**
   * Solves the references in the encoded data by replacing them with their corresponding values.
   *
   * @param {Uint8Array} encoded - The encoded data with references.
   * @param {AbiArg[]} args - The array of arguments with their types.
   * @returns {Uint8Array} - The updated encoded data with solved references.
   */
  solveReferences (encoded: Uint8Array, args: AbiArg[]): Uint8Array {
    const reader = new BufReader(encoded)
    const indexes = reader.readSeq(r => r.readU8())
    const into = new BufWriter()
    const types = args.map(arg => arg.type)

    types.forEach((ty, i) => {
      if (indexes.includes(i)) {
        const idx = reader.readU16()
        const value = this.exec.stmtAt(idx).asValue()
        into.writeFixedBytes(value.lift())
      } else {
        this.derefChunk(reader, ty, into)
      }
    })

    return into.data
  }

  private derefChunk (from: BufReader, ty: AbiType, into: BufWriter): void {
    if (ty.nullable) {
      return this.translateNullable(from, ty, into)
    }

    switch (ty.name) {
      case 'bool':
      case 'u8':
      case 'i8':
      case 'u16':
      case 'usize':
      case 'u32':
      case 'u64':
      case 'i16':
      case 'isize':
      case 'i32':
      case 'i64':
      case 'f32':
      case 'f64':
        into.writeFixedBytes(from.readFixedBytes(ty.ownSize()))
        break
      case 'Array':
      case 'Set':
      case 'StaticArray':
        this.translateArray(from, ty, into)
        break
      case 'ArrayBuffer':
      case 'Uint8Array':
      case 'Uint16Array':
      case 'Uint32Array':
      case 'Uint64Array':
      case 'Int8Array':
      case 'Int16Array':
      case 'Int32Array':
      case 'Int64Array':
      case 'Float32Array':
      case 'Float64Array':
        into.writeBytes(from.readBytes())
        break
      case 'BigInt':
        into.writeBool(from.readBool())
        into.writeBytes(from.readBytes())
        break
      case 'string':
        into.writeBytes(from.readBytes())
        break
      case 'Map':
        this.derefMap(from, ty, into)
        break
      default:
        this.derefComplexType(from, ty, into)
        break
    }
  }

  private translateNullable (from: BufReader, ty: AbiType, into: BufWriter) {
    const flag = from.readU8()
    if (flag !== 0) {
      into.writeU8(1)
      this.derefChunk(from, ty.toPresent(), into)
    } else {
      into.writeU8(0)
    }
  }

  private translateArray (from: BufReader, ty: AbiType, into: BufWriter) {
    const length = from.readULEB()
    into.writeULEB(length)
    for (let i = 0; i < length; i++) {
      this.derefChunk(from, ty.args[0], into)
    }
  }

  private derefMap (from: BufReader, ty: AbiType, into: BufWriter) {
    const length = from.readULEB()
    into.writeULEB(length)
    for (let i = 0; i < length; i++) {
      this.derefChunk(from, ty.args[0], into)
      this.derefChunk(from, ty.args[1], into)
    }
  }

  /**
   * At this point the argument might be a plain object or a Jig. Jigs are always sent
   * as references, so we need to dereference them. Objects are traversed by its properties.
   * @param from
   * @param ty
   * @param into
   * @private
   */
  private derefComplexType (from: BufReader, ty: AbiType, into: BufWriter) {
    const objDef = this.abi.objectDef(ty.name)

    if (objDef.isPresent()) {
      for (const fieldTy of objDef.get().fields) {
        this.derefChunk(from, fieldTy.type, into)
      }
      return
    } else {
      const idx = from.readU16()
      const stmt = this.exec.stmtAt(idx).asValue()
      const lifted = stmt.lift()
      into.writeFixedBytes(lifted)
    }
  }
}
