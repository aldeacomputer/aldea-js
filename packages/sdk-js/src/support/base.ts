import { hex as b16, base64 as b64, bech32m as b32m } from '@scure/base'

export interface Encoder {
  encode(data: Uint8Array): string;
  decode(str: string): Uint8Array;
}

/**
 * Interface for encoding two and from base16 / hex.
 */
export namespace base16 {
  /**
   * Encodes the given bytes as a hex string.
   */
  export function encode(data: Uint8Array): string {
    return b16.encode(data)
  }

  /**
   * Decodes the given hex string to bytes.
   */
  export function decode(str: string): Uint8Array {
    return b16.decode(str)
  }
}

/**
 * Interface for encoding two and from base64.
 */
 export namespace base64 {
  /**
   * Encodes the given bytes as a base64 string.
   */
  export function encode(data: Uint8Array): string {
    return b64.encode(data)
  }

  /**
   * Decodes the given base64 string to bytes.
   */
  export function decode(str: string): Uint8Array {
    return b64.decode(str)
  }
}

/**
 * Interface for encoding two and from bech32m.
 */
export namespace bech32m {
  /**
   * Encodes the given bytes as a bech32 string with the specified prefix.
   */
  export function encode(data: Uint8Array, prefix: string = ''): string {
    const words = b32m.toWords(data)
    return b32m.encode(prefix, words, 192)
  }

  /**
   * Decodes the given bech32 string to bytes, ensuring a matching prefix.
   */
  export function decode(str: string, prefix: string = ''): Uint8Array {
    const result = b32m.decode(str)
    if (result.prefix === prefix) {
      return b32m.fromWords(result.words)
    } else {
      throw Error(`invalid prefix: ${prefix}`)
    }
  }
}
