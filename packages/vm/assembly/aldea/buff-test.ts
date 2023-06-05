export class BufTest extends Jig {
  a: ArrayBuffer = new ArrayBuffer(16)
  d1: string = '----------'
  u8: Uint8Array = new Uint8Array(16)
  d2: string = '----------'
  u16: Uint16Array = new Uint16Array(16)
  d3: string = '----------'
  u32: Uint32Array = new Uint32Array(16)
  d4: string = '----------'
  u64: Uint64Array = new Uint64Array(16)

  constructor() {
    super()
    Uint8Array.wrap(this.a).fill(255)
    this.u8.fill(255)
    this.u16.fill(255)
    this.u32.fill(255)
    this.u64.fill(255)
  }
}
