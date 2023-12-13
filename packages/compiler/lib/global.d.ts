// @ts-nocheck

/** Base Jig class */
declare class Jig {
  $lock: import('aldea/lock').Lock;
  $output: import('aldea/output').Output;
}

/** Built in Fungible interface */
declare interface Fungible {
  amount: u64;
  send(amount: u64): Fungible;
  combine(coins: Fungible[]): Fungible;
}

/** Built in Coin remote jig */
declare class Coin extends Jig implements Fungible {
  amount: u64;
  constructor(amount: u64);
  send(amount: u64): Coin;
  combine(coins: Coin[]): Coin;
}

/** Global caller instance */
declare const caller: typeof import('aldea/caller').caller;

/** BigInt */
//type BigInt = import('vendor/big-int').BigInt
declare const BigInt: typeof import('vendor/big-int').BigInt;

/** Debug */
declare function debug(msg: string): void;
