/**
 * Aldea SDK-js entry module
 */

// Core exports
export {
  Aldea,
  BCS, BCSWriter, BCSReader,
  Address,
  HDPrivKey,
  HDPubKey,
  KeyPair,
  Lock, LockType, LockSerializer,
  Output, OutputSerializer,
  Pointer, PointerSerializer,
  PrivKey,
  PubKey,
  Tx, TxSerializer,
  TxBuilder, CreateTxCallback,
  Serializable,
  OpCode,
  Instruction, InstructionSerializer, InstructionRef, ref,
  CommitTxResponse
} from './internal.js'

// Instructions exports
export * as instructions from './instructions/index.js'

// Support exports
export { base16, base64, bech32m } from './support/base.js'
export * as blake3 from './support/blake3.js'
export * as ed25519 from './support/ed25519.js'
export * as util from './support/util.js'
