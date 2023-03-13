import {Writable} from "stream";
import {Message} from "./message.js";
import {PipeServer} from "./pipe-server.js";
import {RESPONSE_EVENT} from "./constants.js";

type Pending = {
  resolve: (m: Buffer) => void,
  reject: (e: Error) => void
}

export class Client {
  private output: Writable
  private server: PipeServer | null
  private pending: Map<number, Pending>
  private nextId: number;
  constructor(output: Writable) {
    this.output = output
    this.server = null
    this.pending = new Map()
    this.nextId = 0
  }

  link (server: PipeServer): void {
    this.server = server
    this.server.listen(RESPONSE_EVENT, async (msg) => {
      const callback = this.pending.get(msg.id)
      if (!callback) {
        return
      }
      this.pending.delete(msg.id)
      callback.resolve(msg.body)
    })
  }

  send(topic: string, body: Buffer) {
    const msg = new Message(topic, body, this.nextId)
    this.nextId += 1
    this.output.write(msg.serialize())
  }

  async sendWithResponse(topic: string, body: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const msg = new Message(topic, body, this.nextId)
      this.nextId += 1
      this.pending.set(msg.id, { resolve, reject })
      this.output.write(msg.serialize())
    })
  }
}
