import { BigInt } from "../../vendor/big-int"

describe("BigInt", () => {
  test("a dumb test", () => {
    const a = BigInt.fromString('8669ae3aed121f58cfd00affe46e207735c77348d4dc07154810f22e65126dfd', 16)
    const b = BigInt.fromString('8a5a74ae0a576ccb1fa11527aa5fa3dca87744ebe72a217c66f4f4cf816e9f69', 16)
    expect(a.mul(b).toString(16)).toBe('48a4765648b84495fcf76c6449ff3c7321d14c2a1c1a7de2e43b70adeb01a3dc62115df5367b05e4d9d814898695c4e9c19af9c023bd3d97741bf0b8a6953fc5')
  })
})