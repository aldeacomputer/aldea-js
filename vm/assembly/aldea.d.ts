declare enum LockType {
  DESTROYED = -1,
  NONE,
  PUBKEY_HASH,
  CALLER,
  ANYONE,
}

declare interface LockState {
  type: LockType;
  data: ArrayBuffer; // data is either pubkey, origin or empty buf
}

declare interface UtxoState {
  origin: ArrayBuffer;
  location: ArrayBuffer;
  motos: u64;
  lock: LockState;
}

declare enum AuthCheck {
  CALL,
  LOCK
}

declare interface Lock {
  type: LockType;
  data: ArrayBuffer;

  can(type: AuthCheck): bool;

  lockTo(type: LockType, data: ArrayBuffer): void;
  toAddress(address: string): void;
  toPubkeyHash(pubkeyHash: ArrayBuffer): void;
  toCaller(): void;
  toAnyone(): void;
  unlock(): void;
}

declare interface TxOutput {
  origin: string;
  location: string;
  motos: u64;

  destroy(): void;
  canCall(jig: Jig): boolean;
  canLock(jig: Jig): boolean;
}

declare class Jig {
  $lock: Lock
  $output: TxOutput
}
