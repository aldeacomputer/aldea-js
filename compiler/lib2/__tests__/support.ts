export function toHex(data: Uint8Array): string {
  return data.reduce((hex: string, byte: u8): string => {
    return hex + ('0' + byte.toString(16)).slice(-2)
  }, '')
}
