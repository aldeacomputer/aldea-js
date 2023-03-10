type PendingTake = {
  n: number,
  fn: (b: Buffer) => void
}

export class StreamReader {
  streams: Buffer[]
  index: number
  pendingTakes: PendingTake[]
  processChunk: Promise<void>

  constructor(buf: Buffer, start = 0) {
    this.streams = [buf]
    this.index = start
    this.pendingTakes = []
    this.processChunk = Promise.resolve()
  }

  async take (n: number): Promise<Buffer> {
    if (this.pendingByteLength() >= n) {
      return this.syncTake(n)
    } else {
      return new Promise<Buffer>(resolve => {
        this.pendingTakes.push({n, fn: resolve})
      })
    }
    // throw new Error('this should not happen yet')
  }

  indexOf (value: Buffer): number {
    const all = Buffer.concat(this.streams).subarray(this.index)
    return all.indexOf(value)
  }

  rest (): Buffer {
    const ret = this.streams[0].subarray(this.index)
    this.index = this.streams[0].byteLength - 1
    return ret
  }

  isFinished (): boolean {
    return this.index >= this.streams[0].byteLength
  }

  push(rawData: Buffer): void {
    this.streams.push(rawData)

    this.processChunk = this.processChunk.then(async () => {
      while (this.pendingTakes.length > 0 && this.pendingTakes[0].n <= this.pendingByteLength()) {
        const pendingTake = this.pendingTakes.shift()
        if (!pendingTake) {
          throw new Error('inconsistency')
        }
        const data = this.syncTake(pendingTake.n)
        await pendingTake.fn(data)
      }
    })
  }

  pendingByteLength (): number {
    const total = this.streams.reduce((sum, stream) => sum + stream.byteLength, 0);
    return total - this.index
  }

  private syncTake (n: number): Buffer {
    const buffs: Buffer[] = []
    while (n > this.streams[0].byteLength - this.index) {
      const maybeBuff = this.streams.shift();
      if (!maybeBuff) {
        throw new Error('should be there')
      }
      const buff = maybeBuff.subarray(this.index);

      buffs.push(buff)
      n -= buff.byteLength
      this.index = 0
    }
    const end = Math.min(this.index + n, this.streams[0].byteLength)
    const ret = Buffer.concat([
      ...buffs,
      this.streams[0].subarray(this.index, end)
    ])
    this.index += n
    return ret
  }
}
