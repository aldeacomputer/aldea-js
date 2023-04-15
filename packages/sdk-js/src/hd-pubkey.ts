import { PubKey } from './internal.js'
import { bech32m } from './support/base.js'
import { hash, keyedHash } from './support/blake3.js'
import { Point } from './support/ed25519.js'
import { bytesToBn, concatBytes } from './support/util.js'

const HARDENED_OFFSET = 0x80000000
const PREFIX = 'xpub'

/**
 * TODO
 */
export class HDPubKey {
  constructor(private k: Uint8Array, readonly chainCode: Uint8Array) {
    if (this.k.length !== 32) throw new Error('invalid extended key length')
    if (this.chainCode.length !== 32) throw new Error('invalid chainCode length')
  }

  /**
   * TODO
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
   * TODO
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
   * TODO
   */
  toPubKey(): PubKey {
    return PubKey.fromBytes(this.k.slice(0, 32))
  }

  /**
   * TODO
   */
  toBytes(): Uint8Array {
    return concatBytes(this.k, this.chainCode)
  }

  /**
   * TODO
   */
  toString(): string {
    return bech32m.encode(this.toBytes(), PREFIX)
  }
}

// TODO
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
