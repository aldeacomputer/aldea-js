import { base16 as b16, base64 as b64, bech32m as b32m } from '@scure/base'

/**
 * Base16 interface.
 */
export const base16 = {
  /**
   * Encodes the given bytes as a hex string.
   */
  encode(data: Uint8Array): string {
    return b16.encode(data).toLowerCase()
  },

  /**
   * Decodes the given hex string to bytes.
   */
  decode(str: string): Uint8Array {
    return b16.decode(typeof str === 'string' ? str.toUpperCase() : str)
  }
}

/**
 * Base64 interface.
 */
 export const base64 = {
  /**
   * Encodes the given bytes as a base64 string.
   */
  encode(data: Uint8Array): string {
    return b64.encode(data)
  },

  /**
   * Decodes the given base64 string to bytes.
   */
  decode(str: string): Uint8Array {
    return b64.decode(str)
  }
}

/**
 * Bech32m interface.
 */
export const bech32m = {
  /**
   * Encodes the given bytes as a bech32 string with the specified prefix.
   */
  encode(data: Uint8Array, prefix: string = ''): string {
    const words = b32m.toWords(data)
    return b32m.encode(prefix, words)
  },

  /**
   * Decodes the given bech32 string to bytes, ensuring a matching prefix.
   */
  decode(str: string, prefix: string = ''): Uint8Array {
    const result = b32m.decode(str)
    if (result.prefix === prefix) {
      return b32m.fromWords(result.words)
    } else {
      throw Error(`invalid prefix: ${prefix}`)
    }
  }
}