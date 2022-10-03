export function toHex(data: ArrayBuffer): string {
  return Uint8Array.wrap(data).reduce((hex: string, byte: u8): string => {
    return hex + ('0' + byte.toString(16)).slice(-2)
  }, '')
}
