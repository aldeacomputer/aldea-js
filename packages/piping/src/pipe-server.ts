import {Readable, Writable} from "stream";
import {StreamReader} from "./stream-reader.js";
import {Message} from "./message.js";
import {Client} from "./client.js";
import {ALDEA_STR, RESPONSE_EVENT} from "./constants.js";

type EventCallback = (event: Message) => Promise<void>
type ReactCallback = (event: Message) => Promise<Buffer>

/**
 * Server used to receive aldea messages from a readable stream.
 * It needs a readable stram to receive messages and a writable stream
 * to send responses.
 *
 * The server ensures that messages received are processed in order.
 *
 * The server ignores data received between messages.
 */
export class PipeServer {
  private input: Readable;
  private output: Writable
  private callbacks: Map<string, EventCallback>
  private pendingToRead: StreamReader
  private queu: Promise<void>
  private _onDataHandler: ((b: Buffer) => Promise<void>) | null
  private ownClient: Client

  /**
   * Creates a new instance. The new instance is not listening to new messages.
   *
   * @param input stream where incoming messages are going to be received.
   * @param output stream where responses are going to be sent.
   */
  constructor(input: Readable, output: Writable) {
    this.input = input
    this.output = output
    this.callbacks = new Map()
    this.pendingToRead = new StreamReader(Buffer.alloc(0))
    this.queu = Promise.resolve()
    this._onDataHandler = null
    this.ownClient = new Client(output)
    this.ownClient.link(this)
  }

  /**
   * Starts the message listening. After this method is called
   * the server starts to listen to messages. A good idea to avoid
   * loose messages define the handlers before calling start.
   */
  start () {
    this._onDataHandler = async (data: Buffer): Promise<void> => {
      await this.onData(data)
    };
    this.input.on('data', this._onDataHandler)
  }

  /**
   * Returns a client already linked with the current server, using the server's output.
   */
  get client () {
    return this.ownClient
  }

  /**
   * Steps the server. The method returns after finishing to process all pending messages.
   */
  async stop () {
    if (!this._onDataHandler) {
      return
    }
    this.input.removeListener('data', this._onDataHandler)
    this._onDataHandler = null
    await this.queu
  }


  /**
   * Makes the server listen to a message withouth sending a response.
   * @param name Name of the event. Selects which messages are going to be handled.
   * @param callback Code to execute when a message of the desired type arrives
   */
  listen(name: string, callback: EventCallback): void {
    this.callbacks.set(name, callback)
  }

  /**
   * Listens to a specific type of message. When that type of message arrives the callback is executed, and
   * the result of the callback is sent back as response.
   * @param name
   * @param callback
   */
  reactTo(name: string, callback: ReactCallback): void {
    this.listen(name, async (msg) => {
      const chunk = await callback(msg);
      this.output.write(new Message(RESPONSE_EVENT, chunk, msg.id).serialize())
    })
  }

  private async onData(rawData: Buffer): Promise<void> {
    this.pendingToRead.push(rawData)
    this.queu = this.queu.then(() => this.onExec())
  }

  private async onExec(): Promise<void> {
    const start = this.pendingToRead.indexOf(Buffer.from(ALDEA_STR));
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
