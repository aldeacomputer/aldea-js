import { Point, utils, sync } from '@noble/ed25519'
import { HDKey } from '../vendor/ed25519-hdkey.js'
import { PrivKey } from '../privkey.js'
import { PubKey } from '../pubkey.js'
import { blake3 } from './hash.js'

// Internally we replace nobles sha512Sync function with our own blake3
// function. As long as we use the sync methods, we are now using
// blake3-flavoured ed25519 - just like magic!
utils.sha512Sync = (...m: Uint8Array[]): Uint8Array => {
  return blake3(utils.concatBytes(...m), 64)
}

/**
 * Calculates the EdDSA Point (public key) from the given bytes (private key).
 */
export function calcPoint(bytes: Uint8Array): Point {
  return sync.getExtendedPublicKey(bytes).point
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
  return sync.sign(msg, privKey)
}

/**
 * Verifies the given signature using the specified message and Public Key.
 */
export function verify(sig: Uint8Array, msg: Uint8Array, pubKey: PubKey | Uint8Array): boolean {
  let point: Point
  if ('point' in pubKey) { point = pubKey.point }
  else { point = pointFromBytes(pubKey) }
  return sync.verify(sig, msg, point)
}

/**
 * Derives an HD-Node from the given 64 byte seed.
 */
export function seedToNode(seed: Uint8Array): HDKey {
  return HDKey.fromMasterSeed(seed)
}

/**
 * Derives a child node from the given HD-Node and BIP-32 path string.
 */
export function deriveNode(node: HDKey, path: string): HDKey {
  return node.derive(path, true)
}

const randomBytes = utils.randomBytes
export {
  HDKey as HDNode,
  Point,
  randomBytes
}
