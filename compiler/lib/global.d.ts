// @ts-nocheck

/** Base Jig class */
declare class Jig {
  get $lock(): import('aldea/lock').Lock;
  get $output(): import('aldea/output').Output;
}

declare class Coin extends Jig {
  origin: ArrayBuffer;
  send(motos: u64, pubkeyHash: ArrayBuffer): Coin;
  combine(coins: Coin[]): Coin;
}
