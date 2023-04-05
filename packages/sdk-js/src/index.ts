/**
 * Aldea SDK-js entry module
 */

// Core exports
export {
  Aldea,
  Address,
  HDPrivKey,
  HDPubKey,
  KeyPair,
  Lock, LockSerializer,
  Output, OutputSerializer,
  Pointer, PointerSerializer,
  PrivKey,
  PubKey,
  Tx, TxSerializer,
  TxBuilder,
  Serializable,
  OpCode,
  Instruction, InstructionSerializer, InstructionRef, ref,
} from './internal.js'

export * as wallet from './wallet.js'
export * as sqliteStorage from './wallet-storage/sqlite-storage.js'
// Instructions exports
export * as instructions from './instructions/index.js'

// Support exports
export { base16, base64, bech32m } from './support/base.js'
export * as blake3 from './support/blake3.js'
export * as ed25519 from './support/ed25519.js'
export * as util from './support/util.js'

// SingleKeyWallet
export * from './single-key-wallet.js'
