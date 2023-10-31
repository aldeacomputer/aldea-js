// @ts-nocheck

/** Base Jig class */
declare class Jig {
  $lock: import('aldea/lock').Lock;
  $output: import('aldea/output').Output;
}

/** Built in Coin remote jig */
declare class Coin extends Jig {
  get motos(): u64;
  send(motos: u64): Coin;
  combine(coins: Coin[]): Coin;
}

/** Global caller instance */
declare const caller: typeof import('aldea/caller').caller;

/** BigInt */
declare const BigInt: typeof import('vendor/big-int').BigInt;

declare namespace console {
  /** Debug */
  function debug(msg: string): void;
}
