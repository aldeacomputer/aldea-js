import { CURVE } from '@noble/ed25519'
import { PrivKey, PubKey } from '../internal.js'
import { hash } from './blake3.js'
import { bnToBytes, bytesToBn, invert, mod, pow2 } from './util.js'

// The constant a24 is (486662 - 2) / 4 = 121665 for curve25519/X25519
const A_24 = 121665n
const P = CURVE.p

/**
 * Flips the bits of 32 random bytes in order to ensure a x25519 interger scalar.
 */
export function adjustScalarBytes(bytes: Uint8Array): Uint8Array {
  // Section 5: For X25519, in order to decode 32 random bytes as an integer scalar,
  // set the three least significant bits of the first byte
  // and the most significant bit of the last to zero,
  // set the second most significant bit of the last byte to 1
  bytes[0]  &= 248  // 0b1111_1000
  bytes[31] &= 127  // 0b0111_1111
  bytes[31] |= 64   // 0b0100_0000
  return bytes;
}

/**
 * Calculates a shared secret between an X25519 privkey and pubkey.
 */
export function getSharedSecret(privKey: Uint8Array, pubKey: Uint8Array): Uint8Array {
  return scalarMult(pubKey, privKey)
}

/**
 * Mutiplies an X25519 point with the given scalar.
 */
export function scalarMult(pubKey: Uint8Array, privKey: Uint8Array): Uint8Array {
  const u = decodeU(pubKey)
  const scalar = decodeScalar(privKey)
  const pu = mongomeryLadder(u, scalar)
  if (pu === 0n) throw new Error('Invalid private or public key received')
  return encodeU(pu)
}

/**
 * Converts an Ed25519 privkey to X25519.
 */
export function toMontgomeryPriv(privKey: PrivKey): Uint8Array {
  return adjustScalarBytes(hash(privKey.toBytes(), 32))
}

/**
  Converts an Ed25519 pubkey to X25519.
 */
export function toMongomeryPub(pubKey: PubKey): Uint8Array {
  const u = mod((1n + pubKey.y) * invert(1n - pubKey.y))
  return bnToBytes(u)
}

// Asserts the given scalar is valid for X25519.
function assertValidScalar(n: bigint): void {
  if (typeof n !== 'bigint' || n < 0n || n >= P) {
    throw new Error('invalid scalar. must be 0 < scalar < CURVE.P');
  }
}

function cswap(swap: bigint, x_2: bigint, x_3: bigint): [bigint, bigint] {
  const dummy = mod(swap * (x_2 - x_3));
  x_2 = mod(x_2 - dummy);
  x_3 = mod(x_3 + dummy);
  return [x_2, x_3];
}

function decodeScalar(scalar: Uint8Array): bigint {
  if (scalar.length !== 32) {
    throw new Error('invalid u scalar length. must be 32 bytes')
  }
  return bytesToBn(adjustScalarBytes(scalar))
}

function decodeU(u: Uint8Array): bigint {
  if (u.length !== 32) {
    throw new Error('invalid u coordinate length. must be 32 bytes')
  }
  u[31] &= 127  // 0b0111_1111
  return bytesToBn(u)
}

function encodeU(u: bigint): Uint8Array {
  return bnToBytes(mod(u))
}

function mongomeryLadder(u: bigint, k: bigint): bigint {
  assertValidScalar(u)
  assertValidScalar(k)
  
  const x_1 = u
  let x_2 = 1n
  let z_2 = 0n
  let x_3 = u
  let z_3 = 1n
  let swap = 0n
  let sw: [bigint, bigint];
  for (let t = 254n; t >= 0n; t--) {
    const k_t = (k >> t) & 1n
    swap ^= k_t
    sw = cswap(swap, x_2, x_3)
    x_2 = sw[0]
    x_3 = sw[1]
    sw = cswap(swap, z_2, z_3)
    z_2 = sw[0]
    z_3 = sw[1]
    swap = k_t

    const A = x_2 + z_2
    const AA = mod(A * A)
    const B = x_2 - z_2
    const BB = mod(B * B)
    const E = AA - BB
    const C = x_3 + z_3
    const D = x_3 - z_3
    const DA = mod(D * A)
    const CB = mod(C * B)
    const dacb = DA + CB
    const da_cb = DA - CB
    x_3 = mod(dacb * dacb)
    z_3 = mod(x_1 * mod(da_cb * da_cb))
    x_2 = mod(AA * BB)
    z_2 = mod(E * (AA + mod(A_24 * E)))
  }
  sw = cswap(swap, x_2, x_3)
  x_2 = sw[0]
  sw = cswap(swap, z_2, z_3)
  z_2 = sw[0]

  const [pow_p58, b2] = pow_2_252_3(z_2)
  const z2 = mod(pow2(pow_p58, 3n, P) * b2)
  return mod(x_2 * z2)
}

function pow_2_252_3(x: bigint): [bigint, bigint] {
  const x2 = (x * x) % P
  const b2 = (x2 * x) % P
  const b4 = (pow2(b2, 2n, P) * b2) % P
  const b5 = (pow2(b4, 1n, P) * x) % P
  const b10 = (pow2(b5, 5n, P) * b5) % P
  const b20 = (pow2(b10, 10n, P) * b10) % P
  const b40 = (pow2(b20, 20n, P) * b20) % P
  const b80 = (pow2(b40, 40n, P) * b40) % P
  const b160 = (pow2(b80, 80n, P) * b80) % P
  const b240 = (pow2(b160, 80n, P) * b80) % P
  const b250 = (pow2(b240, 10n, P) * b10) % P
  return [(pow2(b250, 2n, P) * x) % P, b2]
}
