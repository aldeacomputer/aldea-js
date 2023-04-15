import { PubKey } from './internal.js'
import { base16, bech32m } from './support/base.js'
import { hash, keyedHash } from './support/blake3.js'
import { Point } from './support/ed25519.js'
import { bytesToBn, concatBytes } from './support/util.js'

const HARDENED_OFFSET = 0x80000000
const PREFIX = 'xpub'

/**
 * Hierarchical deterministic public key
 * 
 * Implements [BIP32-ed25519](https://github.com/LedgerHQ/orakolo/blob/master/papers/Ed25519_BIP%20Final.pdf)
 * with hashing primitives swapped out for BLAKE3.
 */
export class HDPubKey {
  private k: Uint8Array;
  readonly chainCode: Uint8Array;

  constructor(k: Uint8Array, chainCode: Uint8Array) {
    if (k.length !== 32) throw new Error('invalid extended key length')
    if (chainCode.length !== 32) throw new Error('invalid chainCode length')
    this.k = k
    this.chainCode = chainCode
  }

  /**
   * Returns a HDPubKey from the given bytes.
   * 
   * HD Public Keys are 64 bytes.
   */
  static fromBytes(bytes: Uint8Array): HDPubKey {
    if (!ArrayBuffer.isView(bytes)) {
      throw Error('The first argument to `HDPubKey.fromBytes()` must be a `Uint8Array`')
    }
    return new HDPubKey(bytes.slice(0, 32), bytes.slice(32))
  }

  /**
   * Returns a HDPubKey from the given hex-encoded string.
   */
  static fromHex(str: string): HDPubKey {
    if (typeof str !== 'string') {
      throw Error('The first argument to `HDPubKey.fromHex()` must be a `string`')
    }
    const bytes = base16.decode(str)
    return HDPubKey.fromBytes(bytes)
  }

  /**
   * Returns a HDPubKey from the given bech32m-encoded string.
   */
  static fromString(str: string): HDPubKey {
    if (typeof str !== 'string') {
      throw Error('The first argument to `HDPubKey.fromString()` must be a `string`')
    }
    const bytes = bech32m.decode(str, PREFIX)
    return HDPubKey.fromBytes(bytes)
  }

  /**
   * Derives a new HDPubKey from the given derivation path.
   * 
   * The derivation path must of the format described in [BIP-32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki).
   */
  derive(path: string): HDPubKey {
    const parts = path.replace(/^[mM]['hH]?/, '')
      .split('/')
      .filter(p => !!p)
      .map(toIndex)

    let child: HDPubKey = this
    if (path[0] === 'm') throw new Error('cannot derive private child key')
    for (const idx of parts) {
      child = child.deriveChild(idx)
    }
    return child
  }

  /**
   * Derives new HDPubKey from the given index integer.
   */
  deriveChild(idx: number): HDPubKey {
    if (idx >= HARDENED_OFFSET) {
      throw new Error('can not derive hardened child key')
    }

    const ch = hash(this.chainCode, 32)
    const iBuf = new Uint8Array(4)
    const iBufView = new DataView(iBuf.buffer)
    iBufView.setUint32(0, idx, true)

    const z = keyedHash(concatBytes(new Uint8Array([2]), this.k, iBuf), ch)
    const c = keyedHash(concatBytes(new Uint8Array([3]), this.k, iBuf), ch).slice(32, 64)

    const zl = z.slice(0, 28)
    const left = bytesToBn(zl) * BigInt(8)
    const point = this.toPubKey().point.add(Point.BASE.mul(left))

    return new HDPubKey(point.toRawBytes(), c)
  }

  /**
   * Returns the HDPubKey as bytes.
   * 
   * HD Public Keys are 64 bytes.
   */
  toBytes(): Uint8Array {
    return concatBytes(this.k, this.chainCode)
  }

  /**
   * Returns the HDPubKey as hex-encoded string.
   */
  toHex(): string {
    return base16.encode(this.toBytes())
  }

  /**
   * Returns the HDPubKey as bech32m-encoded string.
   */
  toString(): string {
    return bech32m.encode(this.toBytes(), PREFIX)
  }

  /**
   * Returns the HDPubKey's normal PubKey.
   */
  toPubKey(): PubKey {
    return PubKey.fromBytes(this.k.slice(0, 32))
  }
}

// Maps the derivation path part to an index number
function toIndex(part: string): number {
  const m = /^(\d+)(['hH])?$/.exec(part)
  if (!m || m.length !== 3) {
    throw new Error(`invalid child index: ${part}`)
  }
  let idx = +m[1]
  if (idx < 0 || idx >= HARDENED_OFFSET) {
    throw new Error(`invalid child index: ${part}`)
  }
  if (typeof m[2] !== 'undefined') idx += HARDENED_OFFSET
  return idx
}
