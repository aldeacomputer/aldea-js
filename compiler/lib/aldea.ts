export { Auth, AuthCheck, LockType, LockState, UtxoState } from './aldea/auth'
export { ArgWriter } from './aldea/arg-writer'

// @ts-ignore
@external("vm", "vm_constructor")
export declare function vm_constructor<T>(jig: T, name: string): void;

// @ts-ignore
@external("vm", "vm_local_call_start")
export declare function vm_local_call_start<T>(jig: T, fn: string): void;
// @ts-ignore
@external("vm", "vm_local_call_end")
export declare function vm_local_call_end(): void;

// @ts-ignore
@external("vm", "vm_remote_call_i")
export declare function vm_remote_call_i<T>(origin: ArrayBuffer, fn: string, args: ArrayBuffer): T;
// @ts-ignore
@external("vm", "vm_remote_call_s")
export declare function vm_remote_call_s<T>(origin: string, fn: string, args: ArrayBuffer): T;
// @ts-ignore
@external("vm", "vm_remote_prop")
export declare function vm_remote_prop<T>(origin: ArrayBuffer, prop: string): T;
