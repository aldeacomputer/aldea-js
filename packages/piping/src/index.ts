import {Readable, Writable} from "stream";
import {StreamReader} from "./stream-reader.js";
import {Message} from "./message.js";

type EventCallback = (event: Message) => Promise<void>
type ReactCallback = (event: Message) => Promise<Buffer>

export class PipeServer {
  private input: Readable;
  private output: Writable
  private callbacks: Map<string, EventCallback>
  private pendingToRead: StreamReader
  private queu: Promise<void>

  constructor(input: Readable, output: Writable) {
    this.input = input
    this.output = output
    this.callbacks = new Map()
    this.pendingToRead = new StreamReader(Buffer.alloc(0))
    this.queu = Promise.resolve()

    this.input.on('data', async (data) => {
      await this.onData(data)
    })
  }

  listen(name: string, callback: EventCallback): void {
    this.callbacks.set(name, callback)
  }

  reactTo(name: string, callback: ReactCallback): void {
    this.listen(name, async (msg) => {
      const chunk = await callback(msg);
      this.output.write(new Message('_response', chunk, msg.id).serialize())
    })
  }

  private async onData (rawData: Buffer): Promise<void> {
    this.pendingToRead.push(rawData)
    this.queu = this.queu.then(() => this.onExec())
  }

  private async onExec (): Promise<void> {
    const start = this.pendingToRead.indexOf(Buffer.from('aldea'));
    if (start < 0) {
      return
    }
    await this.pendingToRead.take(start)
    const msg = await Message.fromReader(this.pendingToRead)
    const callback = this.callbacks.get(msg.name)
    if (callback) {
      await callback(msg)
    }

    if (this.pendingToRead.pendingByteLength() >= 9) {
      this.queu = this.queu.then(() => this.onExec())
    }
  }
}
