import {
  vm_caller_typecheck,
  vm_caller_outputcheck,
  vm_caller_output,
  vm_caller_output_val,
} from './imports'

import { Output } from './output'

export namespace caller {
  /**
   * Returns true if the caller is an instance of the given generic type.
   * 
   * When the `exact` option is false (default) it behaves like the `instanceof`
   * keyword and returns true if the caller is and instance of, or a descendent
   * of, the generic type. When `exact` is true it only matches against the
   * exact type.
   */
  export function is<T>(exact: bool = false): bool {
    const rtid = idof<T>()
    return vm_caller_typecheck(rtid, exact)
  }

  /**
   * Returns true if the caller has an output.
   */
  export function hasOutput(): bool {
    return vm_caller_outputcheck()
  }

  /**
   * Returns the Output object of the caller, or throws an error when the caller
   * has no output.
   */
  export function getOutputOrFail(): Output {
    return vm_caller_output()
  }

  /**
   * Returns the Output origin of the caller, or throws an error when the caller
   * has no output.
   */
  export function getOriginOrFail(): ArrayBuffer {
    return vm_caller_output_val('origin')
  }

  /**
   * Returns the Output location of the caller, or throws an error when the
   * caller has no output.
   */
  export function getLocationOrFail(): ArrayBuffer {
    return vm_caller_output_val('location')
  }

  /**
   * Returns the Output class (pointer) of the caller, or throws an error when
   * the caller has no output.
   */
  export function getClassOrFail(): ArrayBuffer {
    return vm_caller_output_val('class')
  }
}
