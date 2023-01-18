import { AuthCheck } from './auth'
import { Jig, JigInitParams } from './jig'
import { LockType } from './lock'

// Local stack tracing callbacks
// * ===========================

// @ts-ignore
@external("vm", "vm_local_call_start")
export declare function vm_local_call_start(jig: Jig, fn: string): void;
// @ts-ignore
@external("vm", "vm_local_call_end")
export declare function vm_local_call_end(): void;
// @ts-ignore
@external("vm", "vm_constructor_end")
export declare function vm_constructor_end(jig: Jig, name: string): void;

// Remote method calls
// * =================

// @ts-ignore
@external("vm", "vm_remote_call_i")
export declare function vm_remote_call_i<T>(origin: ArrayBuffer, fn: string, args: ArrayBuffer): T;
// @ts-ignore
@external("vm", "vm_remote_call_s")
export declare function vm_remote_call_s<T>(classPtr: string, fn: string, args: ArrayBuffer): T;
// @ts-ignore
@external("vm", "vm_remote_call_f")
export declare function vm_remote_call_f<T>(classPtr: string, fn: string, args: ArrayBuffer): T;
// @ts-ignore
@external("vm", "vm_remote_prop")
export declare function vm_remote_prop<T>(origin: ArrayBuffer, prop: string): T;

// Jig initialization hooks
// * ======================

// @ts-ignore
@external("vm", "vm_jig_init")
export declare function vm_jig_init(): JigInitParams;
// @ts-ignore
@external("vm", "vm_jig_link")
export declare function vm_jig_link(jig: Jig, rtid: i32): ArrayBuffer;

// Jig auth
// * ======

// @ts-ignore
@external("vm", "vm_jig_lock")
export declare function vm_jig_lock(origin: ArrayBuffer, type: LockType, args: ArrayBuffer): void;
// @ts-ignore
@external("vm", "vm_jig_authcheck")
export declare function vm_jig_authcheck(origin: ArrayBuffer, check: AuthCheck): bool;