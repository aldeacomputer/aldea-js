import {InstructionRef} from "./cbor-tools.js";

/**
 * All OpCode bytes.
 */
export enum OpCode {
  // Loading
  IMPORT = 0xA1,
  LOAD = 0xA2,
  LOADBYORIGIN = 0xA3,
  // Calling
  NEW = 0xB1,
  CALL = 0xB2,
  EXEC = 0xB3,
  EXECFUNC = 0xB4,
  // Output
  FUND = 0xC1,
  LOCK = 0xC2,
  // Code
  DEPLOY = 0xD1,
  // Cryptography
  SIGN = 0xE1,
  SIGNTO = 0xE2,
}

/**
 * Instruction base class.
 * 
 * An Instruction is Aldea's smallest contiguous unit of execution. A
 * transaction consists of a `OpCode` byte and a number of arguments, depending
 * on the `OpCode`.
 */
export class Instruction {
  opcode: OpCode;

  constructor(opcode: OpCode) {
    this.opcode = opcode
  }
}
