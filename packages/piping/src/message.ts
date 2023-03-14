import {StreamReader} from "./stream-reader.js";
import {ALDEA_STR} from "./constants.js";

/**
 * Message used to communicate between server and client.
 * The message has 3 attributes:
 * - name: Used to link messages and handlers.
 * - body: A plain buffer with the content of the message.
 * - id: A 32 bit unsigned int used to identify a particular message.
 *
 * The message can be serialized as an array of bytes with the following format:
 *
 * - protocol identifier: the word `aldea` in ascii. 5 bytes.
 * - the length of the name of the event. 4 bytes.
 * - the length of the body.4 bytes.
 * - the id. 4 bytes.
 * - the name of the event
 * - the body of the event.
 */
export class Message {
  name: string
  body: Buffer
  id: number;

  /**
   * Builds a nes message with the desired data.
   * @param name
   * @param body
   * @param id
   */
  constructor(name: string, body: Buffer, id: number) {
    this.name = name
    this.body = body
    this.id = id
  }

  /**
   * Serializes the current message into a buffer.
   */
  serialize(): Buffer {
    const nameBuff = Buffer.from(this.name)
    const nameLength = Buffer.alloc(4)
    nameLength.writeUInt32LE(nameBuff.byteLength)
    const bodyLength = Buffer.alloc(4)
    bodyLength.writeUInt32LE(this.body.byteLength)
    const id = Buffer.alloc(4)
    id.writeUInt32LE(this.id)
    return Buffer.concat([
      Buffer.from(ALDEA_STR),
      nameLength,
      bodyLength,
      id,
      nameBuff,
      this.body
    ]);
  }


  /**
   * Creates a message from its serialized version.
   * @param buff
   */
  static parse(buff: Buffer): Message {
    buff = buff.subarray(5)
    const nameLength = buff.readUint32LE()
    const bodyLength = buff.readUint32LE(4)
    const id = buff.readUint32LE(8)
    const name = buff.subarray(12, 12 + nameLength).toString()
    const body = buff.subarray(12 + nameLength, 12 + nameLength + bodyLength)
    return new Message(name, body, id)
  }

  /**
   * Extracts an aldea message from a string reader. After this method
   * called the stream mutates (the message was already read). The returned object
   * is the parsed messsage.
   * @param reader
   */
  static async fromReader(reader: StreamReader): Promise<Message> {
    const aldea = await reader.take(5)
    if (aldea.toString() !== 'aldea') {
      throw new Error('wrong prefix')
    }
    const nameLength = await reader.take(4).then(buf => buf.readUint32LE())
    const bodyLength = await reader.take(4).then(buf => buf.readUint32LE())
    const id = await reader.take(4).then(buf => buf.readUint32LE())
    const name = await reader.take(nameLength).then(buf => buf.toString())
    const body = await reader.take(bodyLength)
    return new this(name, body, id)
  }
}
