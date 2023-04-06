/**
 * Aldea SDK-js entry module
 */

// Core exports
export {
  Aldea,
  Address,
  HDKey,
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

// Instructions exports
export * as instructions from './instructions/index.js'

// Exports support
export { base16, base64, bech32m } from './support/base.js'
export * as hash from './support/hash.js'
export * as bip39 from './support/mnemonic.js'
export * as ed25519 from './support/ed25519.js'

// Legacy exports - these will probably be removed
export { Signature } from './signature.js'
export {ExecFuncArgsSerializer} from "./instruction-serializer.js";
export {SignArgsSerializer} from "./instruction-serializer.js";
export {LoadByOriginArgsSerializer} from "./instruction-serializer.js";
export {LockArgsSerializer} from "./instruction-serializer.js";
export {DeployArgsSerializer} from "./instruction-serializer.js";
export {SignToArgsSerializer} from "./instruction-serializer.js";
export {CallArgsSerializer} from "./instruction-serializer.js";
export {NewArgsSerializer} from "./instruction-serializer.js";
export {FundArgsSerializer} from "./instruction-serializer.js";
export {LoadArgsSerializer} from "./instruction-serializer.js";
export {ImportArgsSerializer} from "./instruction-serializer.js";
export {ExecInstruction} from "./instructions/index.js";
export {ExecArgsSerializer} from "./instruction-serializer.js";
export {CallInstruction} from "./instructions/index.js";
