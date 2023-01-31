// @ts-nocheck

/** Base Jig class */
declare class Jig {
  $lock: import('aldea/lock').Lock;
  $output: import('aldea/output').Output;
}

/** Built in Coin remote jig */
declare class Coin extends Jig {
  get motos(): u64;
  send(motos: u64, pubkeyHash: ArrayBuffer): Coin;
  combine(coins: Coin[]): Coin;
}

/** Global caller instance */
declare const caller: typeof import('aldea/caller').caller;

/** Debug */
declare function vm_debug_str(msg: string): void;
