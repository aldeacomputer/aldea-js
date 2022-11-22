export class BasicMath extends Jig {
  constructor() {
    super()
    throw new Error('no concrete math over here')
  }

  static inc (aNumber: u32): u32 {
    return aNumber + 1
  }
}
