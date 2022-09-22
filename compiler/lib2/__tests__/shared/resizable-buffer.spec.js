import { ResizableBuffer } from "../../shared/resizable-buffer";
describe("new ResizableBuffer()", () => {
    test("creates with defaults", () => {
        const buf = new ResizableBuffer();
        expect(buf.data.length).toBe(1024);
    });
    test("creates with manual size", () => {
        const buf = new ResizableBuffer(4);
        expect(buf.data.length).toBe(4);
    });
});
describe("ResizableBuffer#get()", () => {
    test("returns without resize if not necessary", () => {
        const buf = new ResizableBuffer();
        expect(buf.get(100).data.length).toBe(1024);
    });
    test("resizes if needs more bytes", () => {
        const buf = new ResizableBuffer(4);
        expect(buf.get(21).data.length).toBe(24);
    });
});
describe("ResizableBuffer#trim()", () => {
    test("returns trimmed buffer", () => {
        const buf = new ResizableBuffer();
        expect(buf.trim(100).data.length).toBe(100);
    });
    test("returns without triming of oversized buffer", () => {
        const buf = new ResizableBuffer(4);
        expect(buf.trim(100).data.length).toBe(4);
    });
});
