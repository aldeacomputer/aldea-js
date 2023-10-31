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
declare module 'vendor/big-int' {
	export class BigInt {
	    private d;
	    private n;
	    private isNeg;
	    get isNegative(): boolean;
	    private static readonly p;
	    private static readonly actualBits;
	    private static readonly maxComba;
	    private static readonly digitMask;
	    private static readonly precision;
	    private constructor();
	    /**
	     * Returns a new {BigInt} instance from generic type {T}.
	     *
	     * @param  val the number as {BigInt}, {string}, or {number}
	     * @return BigInt the new {BigInt} instance
	     */
	    static from<T>(val: T): BigInt;
	    static fromString(bigInteger: string, radix?: i32): BigInt;
	    static fromUInt16(val: u16): BigInt;
	    static fromUInt32(val: u32): BigInt;
	    static fromUInt64(val: u64): BigInt;
	    static fromInt16(val: i16): BigInt;
	    static fromInt32(val: i32): BigInt;
	    static fromInt64(val: i64): BigInt;
	    private static fromDigits;
	    copy(): BigInt;
	    opposite(): BigInt;
	    abs(): BigInt;
	    private static getEmptyResultContainer;
	    private trimLeadingZeros;
	    private resize;
	    private grow;
	    toString(radix?: i32): string;
	    toInt32(): i32;
	    toInt64(): i64;
	    toUInt32(): u32;
	    toUInt64(): u64;
	    eq<T>(other: T): boolean;
	    ne<T>(other: T): boolean;
	    lt<T>(other: T): boolean;
	    lte<T>(other: T): boolean;
	    gt<T>(other: T): boolean;
	    gte<T>(other: T): boolean;
	    compareTo(other: BigInt): i32;
	    magCompareTo(other: BigInt): i32;
	    add<T>(other: T): BigInt;
	    sub<T>(other: T): BigInt;
	    private _add;
	    private _sub;
	    private _addOne;
	    private _subOne;
	    mul2(): BigInt;
	    div2(): BigInt;
	    private mulBasisPow;
	    private divBasisPow;
	    mulPowTwo(k: i32): BigInt;
	    divPowTwo(k: i32): BigInt;
	    modPowTwo(k: i32): BigInt;
	    leftShift(k: i32): BigInt;
	    rightShift(k: i32): BigInt;
	    private leftShiftByAbsolute;
	    private rightShiftByAbsolute;
	    private rightShiftMustRoundDown;
	    private static rightShiftByMaximum;
	    mul<T>(other: T): BigInt;
	    private _mulPartial;
	    private _mulComba;
	    pow<T>(val: T): BigInt;
	    private _powBigint;
	    private _powInt;
	    square(): BigInt;
	    private _baseSquare;
	    private _squareComba;
	    sqrt(): BigInt;
	    log2(): BigInt;
	    log<T>(base: T): BigInt;
	    private _logNumber;
	    private _logBigint;
	    div<T>(other: T): BigInt;
	    mod<T>(other: T): BigInt;
	    divMod<T>(other: T): BigInt[];
	    private _div;
	    private _divRemainder;
	    private _divMod;
	    private _divCore;
	    roundedDiv<T>(other: T): BigInt;
	    addInt(b: u32): BigInt;
	    subInt(b: u32): BigInt;
	    mulInt(b: u32): BigInt;
	    private inplaceMulInt;
	    divInt(b: u32): BigInt;
	    private inplaceDivInt;
	    modInt(b: u32): u32;
	    divModInt(b: u32): BigInt[];
	    roundedDivInt(b: u32): BigInt;
	    bitwiseNot(): BigInt;
	    bitwiseAnd<T>(other: T): BigInt;
	    bitwiseOr<T>(other: T): BigInt;
	    bitwiseXor<T>(other: T): BigInt;
	    private static _and;
	    private _andNot;
	    private static _or;
	    private static _xor;
	    countBits(): i32;
	    isOdd(): boolean;
	    isZero(): boolean;
	    private static isPow2;
	    static get ZERO(): BigInt;
	    static get ONE(): BigInt;
	    static get NEG_ONE(): BigInt;
	    static eq<T, U>(left: T, right: U): boolean;
	    private static eqOp;
	    static ne<T, U>(left: T, right: U): boolean;
	    private static neOp;
	    static lt<T, U>(left: T, right: U): boolean;
	    private static ltOp;
	    static lte<T, U>(left: T, right: U): boolean;
	    private static lteOp;
	    static gt<T, U>(left: T, right: U): boolean;
	    private static gtOp;
	    static gte<T, U>(left: T, right: U): boolean;
	    private static gteOp;
	    static add<T, U>(left: T, right: U): BigInt;
	    private static addOp;
	    static sub<T, U>(left: T, right: U): BigInt;
	    private static subOp;
	    static mul<T, U>(left: T, right: U): BigInt;
	    private static mulOp;
	    static div<T, U>(left: T, right: U): BigInt;
	    static divOp(left: BigInt, right: BigInt): BigInt;
	    static mod<T, U>(left: T, right: U): BigInt;
	    private static modOp;
	    static pow<T>(base: T, k: i32): BigInt;
	    private static powOp;
	    private static leftShift;
	    private static rightShift;
	    static bitwiseNot<T>(a: T): BigInt;
	    static bitwiseAnd<T, U>(a: T, b: U): BigInt;
	    private static bitwiseAndOp;
	    static bitwiseOr<T, U>(a: T, b: U): BigInt;
	    private static bitwiseOrOp;
	    static bitwiseXor<T, U>(a: T, b: U): BigInt;
	    private static bitwiseXorOp;
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

/** BigInt */
declare const BigInt: typeof import('vendor/big-int').BigInt;

/** Debug */
declare function vm_debug_str(msg: string): void;
