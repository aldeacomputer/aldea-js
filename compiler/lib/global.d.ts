// @ts-nocheck

/** Base Jig class */
declare class Jig {
  get $lock(): import('aldea/lock').Lock;
  get $output(): import('aldea/output').Output;
}

/** RemoteJig class */
declare class RemoteJig extends Jig {
  origin: ArrayBuffer;
}

/** Built in Coin remote jig */
declare class Coin extends RemoteJig {
  get motos(): u64;
  send(motos: u64, pubkeyHash: ArrayBuffer): Coin;
  combine(coins: Coin[]): Coin;
}
