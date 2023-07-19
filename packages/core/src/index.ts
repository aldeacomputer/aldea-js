/**
 * Aldea Core entry module
 */

// Core exports
export {
  BCS, BufWriter, BufReader, Serializable,
  Address,
  HDPrivKey,
  HDPubKey,
  KeyPair,
  Lock, LockType, LockInterface, LockSerializer,
  Output, OutputInterface, OutputSerializer,
  Pointer, PointerSerializer,
  PrivKey,
  PubKey,
  SharedKeyPair,
  Tx, TxSerializer,
  OpCode,
  Instruction, InstructionSerializer, InstructionRef,
  abiFromBin,
  abiFromJson,
  abiToBin,
  abiToJson,
  ref,
} from './internal.js'

// ABI types and helpers
export * as abi from './abi/index.js'

// Instructions exports
export * as instructions from './instructions/index.js'

// Support exports
export { base16, base64, bech32m } from './support/base.js'
export * as blake3 from './support/blake3.js'
export * as ed25519 from './support/ed25519.js'
export * as util from './support/util.js'
