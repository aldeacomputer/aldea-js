export class ResizableBuffer {
    constructor(size = 1024) {
        this.chunk = size;
        this.data = new Uint8Array(this.chunk);
        this.view = asDataView(this.data);
    }
    get(size) {
        if (size > this.data.length) {
            const oldPtr = changetype(this.data);
            const chunks = ceil(size / this.chunk);
            const newData = new Uint8Array(chunks * this.chunk);
            newData.set(this.data);
            this.data = newData;
            this.view = asDataView(this.data);
            heap.free(oldPtr);
        }
        return this;
    }
    trim(size) {
        if (size < this.data.length) {
            const oldPtr = changetype(this.data);
            this.data = this.data.subarray(0, size);
            this.view = asDataView(this.data);
            heap.free(oldPtr);
        }
        return this;
    }
}
function asDataView(data) {
    return new DataView(data.buffer, data.byteOffset, data.byteLength);
}
