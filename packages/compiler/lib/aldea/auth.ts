import { vm_jig_authcheck } from './imports'
import {Jig} from "./jig";

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
export function canCall(jig: Jig): bool {
  return vm_jig_authcheck(jig.$output.origin, AuthCheck.CALL)
}

/**
 * Check if the caller can lock the given jig
 */
export function canLock(jig: Jig): bool {
  return vm_jig_authcheck(jig.$output.origin, AuthCheck.LOCK)
}
