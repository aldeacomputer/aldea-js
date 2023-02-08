import { AuthCheck } from './auth'
import { Jig, JigInitParams } from './jig'
import { LockType } from './lock'
import { Output } from './output'

// Jig initialization
// * ================

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

// Method calls
// * ==========

// @ts-ignore
@external("vm", "vm_constructor_local")
export declare function vm_constructor_local(name: string, args: ArrayBuffer): JigInitParams;
// @ts-ignore
@external("vm", "vm_constructor_remote")
export declare function vm_constructor_remote(pkgId: string, name: string, args: ArrayBuffer): JigInitParams;
// @ts-ignore
@external("vm", "vm_call_method")
export declare function vm_call_method<T>(origin: ArrayBuffer, fn: string, args: ArrayBuffer): T;
// @ts-ignore
@external("vm", "vm_call_static")
export declare function vm_call_static<T>(pkgId: string, fn: string, args: ArrayBuffer): T;
// @ts-ignore
@external("vm", "vm_call_function")
export declare function vm_call_function<T>(pkgId: string, fn: string, args: ArrayBuffer): T;
// @ts-ignore
@external("vm", "vm_get_prop")
export declare function vm_get_prop<T>(origin: ArrayBuffer, prop: string): T;

// Caller hooks
// * ==========

// @ts-ignore
@external("vm", "vm_caller_typecheck")
export declare function vm_caller_typecheck(rtid: i32, exact: bool): bool;
// @ts-ignore
@external("vm", "vm_caller_outputcheck")
export declare function vm_caller_outputcheck(): bool;
// @ts-ignore
@external("vm", "vm_caller_output")
export declare function vm_caller_output(): Output;
// @ts-ignore
@external("vm", "vm_caller_output_val")
export declare function vm_caller_output_val(key: string): ArrayBuffer;
// @ts-ignore
@external("vm", "vm_debug_str")
export declare function vm_debug_str(msg: string): void;
