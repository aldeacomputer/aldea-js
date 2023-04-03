import {vm_jig_init, vm_jig_link, vm_proxy_link} from './imports';
import { Lock, LockType } from './lock'
import { Output } from './output'

/**
 * Jig init params
 */
export class JigInitParams {
  // @ts-ignore - typescript complains here but assemblyscript doesn't
  origin: ArrayBuffer;
  // @ts-ignore
  location: ArrayBuffer;
  // @ts-ignore
  classPtr: ArrayBuffer;
  // @ts-ignore
  lockType: LockType;
  // @ts-ignore
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

  constructor(params: JigInitParams) {
    this.$output = {
      origin:   params.origin,
      location: params.location,
      classPtr: params.classPtr,
    }
    this.$lock = new Lock(params.origin, params.lockType, params.lockData)
  }
}

/**
 * Local Jig class
 */
export class _LocalJig extends _BaseJig {
  constructor() {
    const params = vm_jig_init()
    super(params)
    const ptr = changetype<i32>(this)
    const rtid = load<i32>(ptr-8)
    this.$output.classPtr = vm_jig_link(this, rtid)
  }
}

/**
 * Remote Jig class
 */
export class _RemoteJig extends _BaseJig {
  constructor(params: JigInitParams) {
    super(params)
    vm_proxy_link(this, this.$output.origin)
  }
}
