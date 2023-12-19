/**
 * Runtime error related to lack of permissions.
 */
export class PermissionError extends Error {}

/**
 * Runtime error. It might a throw inside the code, a division by zero or
 * any kind of breaking in the Aldea protocol.
 */
export class ExecutionError extends Error {}

/**
 * Error raised when a rule that should be followed is broken. For example,
 * a jig referencing a jig that does not exist.
 */
export class InvariantBroken extends Error {}

