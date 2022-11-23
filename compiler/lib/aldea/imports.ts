import { AuthCheck } from './auth'
import { Jig } from './jig'
import { LockType } from './lock'
import { OutputState } from './output'

// Local stack tracing callbacks
// * ===========================

// @ts-ignore
@external("vm", "vm_constructor")
export declare function vm_constructor(jig: Jig, name: string): void;
// @ts-ignore
@external("vm", "vm_local_call_start")
export declare function vm_local_call_start(jig: Jig, fn: string): void;
// @ts-ignore
@external("vm", "vm_local_call_end")
export declare function vm_local_call_end(): void;

// Remote method calls
// * =================

// @ts-ignore
@external("vm", "vm_remote_call_i")
export declare function vm_remote_call_i<T>(origin: ArrayBuffer, fn: string, args: ArrayBuffer): T;
// @ts-ignore
@external("vm", "vm_remote_call_s")
export declare function vm_remote_call_s<T>(origin: string, fn: string, args: ArrayBuffer): T;
// @ts-ignore
@external("vm", "vm_remote_prop")
export declare function vm_remote_prop<T>(origin: ArrayBuffer, prop: string): T;

// Lock API calls
// * ============

// @ts-ignore
@external("vm", "vm_local_authcheck")
export declare function vm_local_authcheck(jig: Jig, check: AuthCheck): bool;
// @ts-ignore
@external("vm", "vm_local_lock")
export declare function vm_local_lock(jig: Jig, type: LockType, args: ArrayBuffer): void;
// @ts-ignore
@external("vm", "vm_remote_authcheck")
export declare function vm_remote_authcheck(origin: ArrayBuffer, check: AuthCheck): bool;
// @ts-ignore
@external("vm", "vm_remote_lock")
export declare function vm_remote_lock(origin: ArrayBuffer, type: LockType, args: ArrayBuffer): void;

// Output API calls
// * ==============

// @ts-ignore
@external("vm", "vm_local_state")
export declare function vm_local_state(jig: Jig): OutputState;
// @ts-ignore
@external("vm", "vm_remote_state")
export declare function vm_remote_state(origin: ArrayBuffer): OutputState;
