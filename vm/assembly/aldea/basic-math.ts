export class BasicMath extends Jig {
  constructor() {
    super()
    throw new Error('no concrete math over here')
  }

  static inc (aNumber: u32): u32 {
    return aNumber + 1
  }

  static add (aNumber: u32, anotherNumber: u32): u32 {
    return aNumber + anotherNumber
  }
}

export function fAddOne(n: u32): u32 {
  return n + 1
}
