import {Readable, Stream} from 'stream';
import {Client} from "../src/client.js";
import {Message} from '../src/message.js';
import {expect} from 'chai'
import {PipeServer} from '../src/index.js';

describe('client', () => {
  it('sends a right message', (done) => {
    const output = new Stream.Writable({
      write: function(chunk, _encoding, _next) {
        const msg = Message.parse(chunk);
        expect(msg.id).to.eql(0)
        expect(msg.name).to.eql('foo')
        expect(msg.body.toString()).to.eql('bar')
        done()
      }
    });
    const client = new Client(output)

    client.send('foo', Buffer.from('bar'))
  })

  it('can wait for a response', async () => {
    const output = new Stream.Writable({
      write: function(chunk, encoding, next) {
        const query = Message.parse(chunk)
        input.push(new Message('_response', Buffer.from('response'), query.id).serialize())
        next()
      }
    });
    const input = new Readable({
      read() {}
    })
    const server = new PipeServer(input, output)
    server.start()


    const client = new Client(output)
    client.link(server)

    const response = await client.sendWithResponse('foo', Buffer.from('bar'))
    expect(response).to.eql(Buffer.from('response'))
  })
})
