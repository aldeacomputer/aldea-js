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
