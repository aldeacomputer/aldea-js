declare module 'aldea/lock' {
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
	 * Lock API
	 *
	 * Never instantiated directly - only accessed via jig, eg: `jig.$lock`.
	 */
	export class Lock {
	    readonly origin: ArrayBuffer;
	    type: LockType;
	    data: ArrayBuffer;
	    constructor(origin: ArrayBuffer, type: LockType, data: ArrayBuffer);
	    assertType(type: LockType): void;
	    change(type: LockType, data?: ArrayBuffer): void;
	    changeToAddressLock(pubkeyHash: ArrayBuffer): void;
	    changeToJigLock(): void;
	    changeToPublicLock(): void;
	    getAddressOrFail(): ArrayBuffer;
	    getOriginOrFail(): ArrayBuffer;
	    unlock(): void;
	    freeze(): void;
	}

}
declare module 'aldea/output' {
	/**
	 * Output object
	 */
	export class Output {
	    readonly origin: ArrayBuffer;
	    readonly location: ArrayBuffer;
	    classPtr: ArrayBuffer;
	}

}
declare module 'aldea/jig' {
	import { Lock, LockType } from 'aldea/lock';
	import { Output } from 'aldea/output';
	/**
	 * Jig init params
	 */
	export class JigInitParams {
	    origin: ArrayBuffer;
	    location: ArrayBuffer;
	    classPtr: ArrayBuffer;
	    lockType: LockType;
	    lockData: ArrayBuffer;
	}
	/**
	 * TODO
	 */
	export interface Jig {
	    readonly $output: Output;
	    readonly $lock: Lock;
	}
	/**
	 * Base Jig class
	 */
	export class _BaseJig implements Jig {
	    readonly $output: Output;
	    readonly $lock: Lock;
	    constructor(params: JigInitParams);
	}
	/**
	 * Local Jig class
	 */
	export class _LocalJig extends _BaseJig {
	    constructor();
	}
	/**
	 * Remote Jig class
	 */
	export class _RemoteJig extends _BaseJig {
	    constructor(params: JigInitParams);
	}

}
declare module 'aldea/auth' {
	import { JigLike } from 'aldea/jig';
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
	export function canCall(jig: JigLike): bool;
	/**
	 * Check if the caller can lock the given jig
	 */
	export function canLock(jig: JigLike): bool;

}
declare module 'aldea/coin' {
	import { _RemoteJig } from 'aldea/jig';
	/**
	 * Coin class
	 *
	 * Built in Jig that proxies calls to the VM for handling.
	 */
	export class Coin extends _RemoteJig {
	    constructor();
	    get motos(): u64;
	    send(motos: u64): Coin;
	    combine(coins: Coin[]): Coin;
	}

}
declare module 'aldea/caller' {
	import { Output } from 'aldea/output';
	export namespace caller {
	    /**
	     * Returns true if the caller is an instance of the given generic type.
	     *
	     * When the `exact` option is false (default) it behaves like the `instanceof`
	     * keyword and returns true if the caller is and instance of, or a descendent
	     * of, the generic type. When `exact` is true it only matches against the
	     * exact type.
	     */
	    function is<T>(exact?: bool): bool;
	    /**
	     * Returns true if the caller has an output.
	     */
	    function hasOutput(): bool;
	    /**
	     * Returns the Output object of the caller, or throws an error when the caller
	     * has no output.
	     */
	    function getOutputOrFail(): Output;
	    /**
	     * Returns the Output origin of the caller, or throws an error when the caller
	     * has no output.
	     */
	    function getOriginOrFail(): ArrayBuffer;
	    /**
	     * Returns the Output location of the caller, or throws an error when the
	     * caller has no output.
	     */
	    function getLocationOrFail(): ArrayBuffer;
	    /**
	     * Returns the Output class (pointer) of the caller, or throws an error when
	     * the caller has no output.
	     */
	    function getClassOrFail(): ArrayBuffer;
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

/** Debug */
declare function vm_debug_str(msg: string): void;
