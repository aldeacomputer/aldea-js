declare enum LockType {
  NONE,     // 0 - default, vm allows anyone to lock, but prevents function calls
  PUBKEY,   // 1 - vm requires valid signature to call function or change lock
  PARENT,   // 2 - vm requires parent is caller to call function or change lock
  ANYONE,   // 3 - can only be set in constructor, vm allows anyone to call function, but prevents lock change
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

declare namespace Auth {
  export function lockToNone(jig: any): void;
  export function lockToPubkey<T>(jig: T, pubkey: ArrayBuffer): void;
  export function lockToParent<T1, T2>(jig: T1, parent: T2): void;
  export function lockToAnyone(jif: any): void;
  export function authcheck(jig: any, check: AuthCheck): bool;
  export function getUtxoState(jig: any): UtxoState;
  export function getLockState(jig: any): LockState;
  export function getLockType(jig: any): LockType;
}
