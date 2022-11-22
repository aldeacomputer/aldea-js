// @ts-nocheck

/** Base Jig class */
declare class Jig {
  get $lock(): import('aldea/lock').Lock;
  get $output(): import('aldea/output').Output;
}
