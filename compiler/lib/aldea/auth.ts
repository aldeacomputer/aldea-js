import { vm_local_authcheck, vm_remote_authcheck } from './imports'
import { Jig, RemoteJig } from './jig'

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
  return authcheck(jig, AuthCheck.CALL)
}

/**
 * Check if the caller can lock the given jig
 */
export function canLock(jig: Jig): bool {
  return authcheck(jig, AuthCheck.LOCK)
}

// Checks permissions from the VM for the given local or remote Jig.
function authcheck(jig: Jig, check: AuthCheck): bool {
  if (jig instanceof RemoteJig) {
    const rjig = jig as RemoteJig
    return vm_remote_authcheck(rjig.origin, check)
  } else {
    return vm_local_authcheck(jig, check)
  }
}
