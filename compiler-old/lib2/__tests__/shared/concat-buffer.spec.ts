import { ConcatBuffer } from "../../shared/concat-buffer"

describe("ConcatBuffer#add()", () => {
  test("adds and returns a writable buffer", () => {
    const cbuf = new ConcatBuffer()
    expect(cbuf.add(100).data.length).toBe(100)
  })
})

describe("ConcatBuffer#export()", () => {
  test("concats and returns writable buffer", () => {
    const cbuf = new ConcatBuffer()
    cbuf.add(100)
    cbuf.add(100)
    cbuf.add(50)
    expect(cbuf.export().length).toBe(250)
  })
})