export class A extends Jig {
  constructor() {
    super()
  }

  m1(): void {
    const a = BigInt.fromUInt32(1000)
    const b = BigInt.fromUInt32(1000)
    const c = a * b
    debug(`${c.d}`)
    debug(`${c.n}`)
  }
}
