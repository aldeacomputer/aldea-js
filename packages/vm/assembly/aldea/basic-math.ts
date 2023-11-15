export class BasicMath extends Jig {
  constructor() {
    super()
    throw new Error('no concrete math over here')
  }
}

export function fAddOne(n: u32): u32 {
  return n + 1
}
