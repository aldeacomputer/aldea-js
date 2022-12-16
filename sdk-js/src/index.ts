/**
 * Aldea SDK-js entry module
 */

// Core exports
export {
  Aldea,
  Address, isAddress,
  HDKey, isHDKey,
  KeyPair, isKeyPair,
  Lock, LockSerializer,
  Pointer, PointerSerializer,
  PrivKey, isPrivKey,
  PubKey, isPubKey,
  Tx, isTx, TxSerializer,
  TxBuilder,
  OpCode,
  Instruction, InstructionSerializer, InstructionRef, ref,
} from './internal.js'

// Instructions exports
export * as instructions from './instructions/index.js'

// Exports support
export { base16, base64, bech32m } from './support/base.js'
export * as hash from './support/hash.js'
export * as bip39 from './support/mnemonic.js'
export * as ed25519 from './support/ed25519.js'

// Legacy exports - these will probably be removed
export { Signature } from './signature.js'
