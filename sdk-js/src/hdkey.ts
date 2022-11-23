import { PrivKey, PubKey } from './internal.js'
import { HDNode, seedToNode, deriveNode } from './support/ed25519.js'

/**
 * Hierarchical deterministic key
 * 
 * Implements BIP-32 and SLIP-0010 hierarchical deterministic wallets.
 * 
 * - TODO to/from xpub/xpriv not implemented yet - waiting for upstream implementation
 * - TODO currently not supporting public only keychains
 */
export class HDKey {
  node: HDNode;

  constructor(node: HDNode) {
    this.node = node
  }

  /**
   * Node PrivKey
   */
  get privKey() {
    return PrivKey.fromBytes(this.node.privateKey)
  }

  /**
   * Node PubKey
   */
  get pubKey() {
    return PubKey.fromBytes(this.node.publicKeyRaw)
  }

  /**
   * Returns and HDKey from the given 64 byte seed.
   */
  static fromSeed(seed: Uint8Array): HDKey {
    const node = seedToNode(seed)
    return new HDKey(node)
  }

  /**
   * Derives a new HDKey from the given path.
   */
  derive(path: string): HDKey {
    const node = deriveNode(this.node, path)
    return new HDKey(node)
  }
}

/**
 * Checks the given argument is an HDKey.
 */
export function isHDKey(hdKey: any): boolean {
  return hdKey instanceof HDKey
}
