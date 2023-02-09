import { vm_jig_authcheck } from './imports'
import {JigLike} from "aldea/jig";

/**
 * AuthCheck type
 * 
 * - call - can the caller call a method on the jig?
 * - lock - can the caller lock the jig?
 */
export enum AuthCheck {
  CALL,
  LOCK,
}

/**
 * Check if the caller can call the given jig
 */
export function canCall(jig: JigLike): bool {
  return vm_jig_authcheck(jig.$output.origin, AuthCheck.CALL)
}

/**
 * Check if the caller can lock the given jig
 */
export function canLock(jig: JigLike): bool {
  return vm_jig_authcheck(jig.$output.origin, AuthCheck.LOCK)
}
