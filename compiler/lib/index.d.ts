declare module 'aldea/lock' {
	import { Jig } from 'aldea/jig';
	/**
	 * Lock Types
	 *
	 * - Frozen   - can't be called; can't be locked; (can be loaded?)
	 * - None     - can't be called; anyone can lock; (default type)
	 * - Address  - requires sig to call; requires sig to lock;
	 * - Jig      - caller must be parent; new lock must be set by parent;
	 * - Public   - anyone can call; new lock must be set by self;
	 */
	export enum LockType {
	    FROZEN = -1,
	    NONE = 0,
	    ADDRESS = 1,
	    JIG = 2,
	    PUBLIC = 3
	}
	/**
	 * Lock State struct
	 *
	 * Data is either pubkey hash, origin, or empty bufer, depending on lock type.
	 */
	export class LockState {
	    type: LockType;
	    data: ArrayBuffer;
	}
	/**
	 * Lock API
	 *
	 * Never instantiated directly - only accessed via jig, eg: `jig.$lock`.
	 */
	export class Lock {
	    private _jig;
	    type: LockType;
	    data: ArrayBuffer;
	    constructor(jig: Jig, state?: LockState | null);
	    to(type: LockType, data?: ArrayBuffer): void;
	    toAddress(pubkeyHash: ArrayBuffer): void;
	    toCaller(): void;
	    toAnyone(): void;
	    unlock(): void;
	    freeze(): void;
	}

}
declare module 'aldea/output' {
	import { Jig } from 'aldea/jig';
	import { LockState } from 'aldea/lock';
	/**
	 * Output State struct
	 */
	export class OutputState {
	    origin: string;
	    location: string;
	    motos: u64;
	    lock: LockState;
	}
	/**
	 * Output API
	 *
	 * Never instantiated directly - only accessed via jig, eg: `jig.$output`.
	 */
	export class Output {
	    private _jig;
	    origin: string;
	    location: string;
	    motos: u64;
	    constructor(jig: Jig, state: OutputState);
	}
	/**
	 * Fetches the output state from the VM for the given local or remote Jig.
	 */
	export function getOutputState(jig: Jig): OutputState;

}
declare module 'aldea/jig' {
	import { Lock } from 'aldea/lock';
	import { Output } from 'aldea/output';
	/**
	 * Base Jig class
	 */
	export class Jig {
	    get $lock(): Lock;
	    get $output(): Output;
	}
	/**
	 * Remote Jig class - never extended from directly
	 */
	export class RemoteJig extends Jig {
	    origin: ArrayBuffer;
	}

}
declare module 'aldea/auth' {
	import { Jig } from 'aldea/jig';
	/**
	 * AuthCheck type
	 *
	 * - call - can the caller call a method on the jig?
	 * - lock - can the caller lock the jig?
	 */
	export enum AuthCheck {
	    CALL = 0,
	    LOCK = 1
	}
	/**
	 * Check if the caller can call the given jig
	 */
	export function canCall(jig: Jig): bool;
	/**
	 * Check if the caller can lock the given jig
	 */
	export function canLock(jig: Jig): bool;

}
declare module 'aldea/coin' {
	import { RemoteJig } from 'aldea/jig';
	/**
	 * Coin class
	 *
	 * Built in RemoteJig that proxies calls to the VM for handling.
	 */
	export class Coin extends RemoteJig {
	    constructor();
	    get motos(): u64;
	    send(motos: u64, to: ArrayBuffer): Coin;
	    combine(coins: Coin[]): Coin;
	}

}
declare module 'aldea/bytes' {
	/**
	 * Bytes class
	 *
	 * A wrapper around an ArrayBuffer that provides convinience helpers for
	 * converting to and from common encoding formats.
	 */
	export class Bytes {
	    buffer: ArrayBuffer;
	    constructor(buf: ArrayBuffer);
	    static fromBuffer(buf: ArrayBuffer): Bytes;
	    static fromBase16(str: string): Bytes;
	    static fromBase64(str: string): Bytes;
	    static fromBase64url(str: string, padding?: bool): Bytes;
	    static fromBech32(str: string, prefix?: string | null): Bytes;
	    static fromBech32m(str: string, prefix?: string | null): Bytes;
	    static fromHex(str: string): Bytes;
	    static fromString(str: string): Bytes;
	    toBase16(): string;
	    toBase64(): string;
	    toBase64url(padding?: bool): string;
	    toBech32(prefix: string): string;
	    toBech32m(prefix: string): string;
	    toHex(): string;
	    toString(): string;
	}
	/**
	 * Decodes the Base16 encoded string into a Buffer.
	 */
	export function fromBase16(str: string): ArrayBuffer;
	/**
	 * Decodes the Base64 encoded string into a Buffer.
	 */
	export function fromBase64(str: string): ArrayBuffer;
	/**
	 * Decodes the Base64url encoded string into a Buffer.
	 */
	export function fromBase64url(str: string, padding?: bool): ArrayBuffer;
	/**
	 * Decodes the Bech32 encoded string into a Buffer.
	 */
	export function fromBech32(str: string, prefix?: string | null): ArrayBuffer;
	/**
	 * Decodes the Base32m encoded string into a Buffer.
	 */
	export function fromBech32m(str: string, prefix?: string | null): ArrayBuffer;
	/**
	 * Decodes the Hex encoded string into a Buffer.
	 */
	export function fromHex(str: string): ArrayBuffer;
	/**
	 * Decodes the UTF-16 encoded string into a Buffer.
	 */
	export function fromString(str: string): ArrayBuffer;
	/**
	 * Encodes the buffer into a Base16 encoded string.
	 */
	export function toBase16(buf: ArrayBuffer): string;
	/**
	 * Encodes the buffer into a Base64 encoded string.
	 */
	export function toBase64(buf: ArrayBuffer): string;
	/**
	 * Encodes the buffer into a Base64url encoded string.
	 */
	export function toBase64url(buf: ArrayBuffer, padding?: bool): string;
	/**
	 * Encodes the buffer into a Bech32 encoded string.
	 */
	export function toBech32(buf: ArrayBuffer, prefix: string): string;
	/**
	 * Encodes the buffer into a Bech32m encoded string.
	 */
	export function toBech32m(buf: ArrayBuffer, prefix: string): string;
	/**
	 * Encodes the buffer into a Hex encoded string.
	 */
	export function toHex(buf: ArrayBuffer): string;
	/**
	 * Encodes the buffer into a UTF-16 encoded string.
	 */
	export function toString(buf: ArrayBuffer): string;

}


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
