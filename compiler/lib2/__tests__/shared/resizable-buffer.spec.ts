import { ResizableBuffer } from "../../shared/resizable-buffer"

describe("new ResizableBuffer()", () => {
  test("creates with defaults", () => {
    const rbuf = new ResizableBuffer()
    expect(rbuf.buffer.data.length).toBe(1024)
  })

  test("creates with manual size", () => {
    const rbuf = new ResizableBuffer(4)
    expect(rbuf.buffer.data.length).toBe(4)
  })
})

describe("ResizableBuffer#add()", () => {
  test("returns without resize if not necessary", () => {
    const rbuf = new ResizableBuffer()
    expect(rbuf.add(100).data.length).toBe(1024)
  })

  test("resizes if needs more bytes", () => {
    const rbuf = new ResizableBuffer(4)
    expect(rbuf.add(21).data.length).toBe(24)
  })
})

describe("ResizableBuffer#export()", () => {
  test("returns trimmed buffer", () => {
    const rbuf = new ResizableBuffer()
    expect(rbuf.export(100).length).toBe(100)
  })

  test("returns without triming of oversized buffer", () => {
    const rbuf = new ResizableBuffer(4)
    expect(rbuf.export(100).length).toBe(4)
  })
})
