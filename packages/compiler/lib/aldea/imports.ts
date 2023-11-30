import { AuthCheck } from './auth'
import { Jig, JigInitParams, __ProxyJig } from './jig'
import { LockType } from './lock'
import { Output } from './output'

// Jig initialization
// * ================

// @ts-ignore
@external("vm", "jig_init")
export declare function __vm_jig_init(): JigInitParams;
// @ts-ignore
@external("vm", "jig_link")
export declare function __vm_jig_link(jig: Jig, rtid: i32): ArrayBuffer;

// @ts-ignore
@external("vm", "proxy_link")
export declare function __vm_proxy_link(jig: __ProxyJig, origin: ArrayBuffer): void;

// Jig auth
// * ======

// @ts-ignore
@external("vm", "jig_lock")
export declare function __vm_jig_lock(origin: ArrayBuffer, type: LockType, args: ArrayBuffer): ArrayBuffer;
// @ts-ignore
@external("vm", "jig_authcheck")
export declare function __vm_jig_authcheck(origin: ArrayBuffer, check: AuthCheck): bool;

// Method calls
// * ==========

// @ts-ignore
@external("vm", "constructor_local")
export declare function __vm_constructor_local(name: string, args: ArrayBuffer): JigInitParams;
// @ts-ignore
@external("vm", "constructor_remote")
export declare function __vm_constructor_remote(pkgId: string, name: string, args: ArrayBuffer): JigInitParams;
// @ts-ignore
@external("vm", "call_method")
export declare function __vm_call_method<T>(origin: ArrayBuffer, fn: string, args: ArrayBuffer): T;
// @ts-ignore
@external("vm", "call_function")
export declare function __vm_call_function<T>(pkgId: string, fn: string, args: ArrayBuffer): T;
// @ts-ignore
@external("vm", "get_prop")
export declare function __vm_get_prop<T>(origin: ArrayBuffer, prop: string): T;

// Caller hooks
// * ==========

// @ts-ignore
@external("vm", "caller_typecheck")
export declare function __vm_caller_typecheck(rtid: i32, exact: bool): bool;
// @ts-ignore
@external("vm", "caller_outputcheck")
export declare function __vm_caller_outputcheck(): bool;
// @ts-ignore
@external("vm", "caller_output")
export declare function __vm_caller_output(): Output;
// @ts-ignore
@external("vm", "caller_output_val")
export declare function __vm_caller_output_val(key: string): ArrayBuffer;

// Special dubug tools

// @ts-ignore
@external("vm", "debug_str")
export declare function __vm_debug_str(msg: string): void;
