import {StreamReader} from "./stream-reader.js";

export class Message {
  name: string
  body: Buffer
  id: number;

  constructor(name: string, body: Buffer, id: number) {
    this.name = name
    this.body = body
    this.id = id
  }

  serialize(): Buffer {
    const nameBuff = Buffer.from(this.name)
    const nameLength = Buffer.alloc(4)
    nameLength.writeUInt32LE(nameBuff.byteLength)
    const bodyLength = Buffer.alloc(4)
    bodyLength.writeUInt32LE(this.body.byteLength)
    const id = Buffer.alloc(4)
    id.writeUInt32LE(this.id)
    return Buffer.concat([
      Buffer.from('aldea'),
      nameLength,
      bodyLength,
      id,
      nameBuff,
      this.body
    ]);
  }


  static parse(buff: Buffer): Message {
    buff = buff.subarray(5)
    const nameLength = buff.readUint32LE()
    const bodyLength = buff.readUint32LE(4)
    const id = buff.readUint32LE(8)
    const name = buff.subarray(12, 12 + nameLength).toString()
    const body = buff.subarray(12 + nameLength, 12 + nameLength + bodyLength)
    return new Message(name, body, id)
  }

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
