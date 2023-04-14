import {
  ExtendedPoint as Point,
  sign as _sign,
  verify as _verify,
  etc,
  utils,
} from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'
import { concatBytes } from '@noble/hashes/utils'
import { PrivKey } from '../privkey.js'
import { PubKey } from '../pubkey.js'
import { blake3 } from './hash.js'

// Internally we replace nobles sha512Sync function with our own blake3
// function. As long as we use the sync methods, we are now using
// blake3-flavoured ed25519 - just like magic!
etc.sha512Sync = (...m: Uint8Array[]): Uint8Array => {
  //return sha512(utils.concatBytes(...m))
  return blake3(concatBytes(...m), 64)
}

/**
 * Calculates the EdDSA Point (public key) from the given bytes (private key).
 */
export function calcPoint(bytes: Uint8Array): Point {
  return utils.getExtendedPublicKey(bytes).point
}

/**
 * Returns a point from the given bytes (compressed public key).
 */
export function pointFromBytes(bytes: string | Uint8Array): Point {
  return Point.fromHex(bytes)
}

/**
 * Converts a point to bytes (compressed public key).
 */
export function pointToBytes(point: Point): Uint8Array {
  if (!(point instanceof Point)) {
    throw Error('The first argument to `pointToBytes()` must be a `Point`')
  }
  return point.toRawBytes()
}

/**
 * Signs the given message with the PrivKey and returns a 64 byte signature.
 */
export function sign(msg: Uint8Array, privKey: PrivKey | Uint8Array): Uint8Array {
  if ('d' in privKey) { privKey = privKey.d }
  return _sign(msg, privKey)
}

/**
 * Verifies the given signature using the specified message and Public Key.
 */
export function verify(sig: Uint8Array, msg: Uint8Array, pubKey: PubKey | Uint8Array): boolean {
  if (!(pubKey instanceof Uint8Array)) { pubKey = pubKey.toBytes()}
  return _verify(sig, msg, pubKey)
}

export { Point }
