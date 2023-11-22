import { __vm_jig_init, __vm_jig_link, __vm_proxy_link } from './imports'
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
 * Base Jig interface
 */
export interface Jig {
  readonly $output: Output;
  readonly $lock: Lock;
}

/**
 * Base Jig class
 */
export class __BaseJig implements Jig {
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
export class __LocalJig extends __BaseJig {
  constructor() {
    const params = __vm_jig_init()
    super(params)
    const ptr = changetype<i32>(this)
    const rtid = load<i32>(ptr-8)
    this.$output.classPtr = __vm_jig_link(this, rtid)
  }
}

/**
 * Proxy Jig class
 */
export class __ProxyJig extends __BaseJig {
  constructor(params: JigInitParams) {
    super(params)
    __vm_proxy_link(this, this.$output.origin)
  }
}
