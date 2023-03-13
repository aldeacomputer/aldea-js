import {expect} from 'chai'
import {Readable, Stream} from 'stream'
import {Message} from '../src/message.js';
import {PipeServer} from '../src/index.js';


describe('PipeServer', () => {
  function buildMessage(eventName: string, body: Buffer, id = 0) {
    return new Message(eventName, body, id).serialize()
  }



  function buildServer() {
    const chunks: Buffer[] = []
    const output = new Stream.Writable({
      write: function(chunk, encoding, next) {
        chunks.push(chunk)
        next()
      }
    })
    const input = new Stream.Readable()
    input._read = () => {}
    const server = new PipeServer(input, output);
    server.start()
    return {
      server: server,
      input,
      output,
      chunks
    };
  }

  it('executes callbacks when a message arrives', async () => {
    const { server, input } = buildServer()
    const body = Buffer.from('bar')
    const promise = new Promise(resolve => server.listen('foo', async (a) =>
      resolve(a)
    ))

    input.push(buildMessage("foo", body))
    await promise
  })

  it('sends message as data', async () => {
    const {server, input} = buildServer()
    const body = Buffer.from("somedata");

    const promise = new Promise(resolve => server.listen('foo', async (msg) =>{
      expect(msg.body).to.eql(body)
      expect(msg.name).to.eql('foo')
        resolve(null)
    }))

    input.push(buildMessage("foo", body))
    await promise
  })

  it('can receive 2 messages in the same data event', async () => {
    const {server, input} = buildServer()
    const body1 = Buffer.from("somedata1");
    const body2 = Buffer.from("somedata2");


    server.listen('foo1', async (msg) =>{
      expect(msg.body).to.eql(body1)
      expect(msg.name).to.eql('foo1')
    })

    const promise = new Promise(resolve => server.listen('foo2', async (msg) =>{
      expect(msg.body).to.eql(body2)
      expect(msg.name).to.eql('foo2')
      resolve(null)
    }))

    input.push(
      Buffer.concat([
        buildMessage("foo1", body1),
        buildMessage("foo2", body2)
      ])
    )
    await promise
  })

  it('receives messages in order', async () => {
    const {server, input} = buildServer()
    const body1 = Buffer.from("somedata1");
    const body2 = Buffer.from("somedata2");
    const body3 = Buffer.from("somedata3");

    const messages: Message[] = []

    server.listen('foo1', async (msg) =>{
      messages.push(msg)
    })

    server.listen('foo2', async (msg) =>{
      messages.push(msg)
    })

    const promise = new Promise(resolve => server.listen('foo3', async (msg) =>{
      messages.push(msg)
      resolve(null)
    }))

    input.push(buildMessage('foo1', body1))
    input.push(buildMessage('foo2', body2))
    input.push(buildMessage('foo3', body3))
    await promise
    expect(messages.map(m => m.name)).to.eql(['foo1', 'foo2', 'foo3'])
    expect(messages.map(m => m.body.toString())).to.eql(['somedata1', 'somedata2', 'somedata3'])
  })

  async function finish(server: PipeServer, stream: Readable): Promise<void> {
    return new Promise(resolve => {
      server.listen('_finish', async (_msg) => {
        resolve()
      })
      stream.push(Buffer.from(buildMessage('_finish', Buffer.alloc(0))))
    })
  }

  it('can receive a message in 2 halves', async () => {
    const {server, input} = buildServer()
    const body1 = Buffer.from("somedata");

    let count = 0
    server.listen('foo', async (msg) =>{
      expect(msg.name).to.eql('foo')
      expect(msg.body).to.eql(body1)
      count += 1
    })

    const data = buildMessage('foo', body1);
    await input.push(data.subarray(0, 10))
    await input.push(data.subarray(10))
    await finish(server, input)
    expect(count).to.eql(1)
  })

  it('can receive a message in really tiny chunks', async () => {
    const {server, input} = buildServer()
    const body1 = Buffer.from("somedata");

    let count = 0
    server.listen('foo', async (msg) =>{
      expect(msg.name).to.eql('foo')
      expect(msg.body).to.eql(body1)
      count += 1
    })

    const data = buildMessage('foo', body1);
    for (const byte of Array.from(data)) {
      input.push(Buffer.from([byte]))
    }
    await finish(server, input)
    expect(count).to.eql(1)
  })

  describe('#reactTo', () => {
    it('receives the right message on the callback', async () => {
      const {server, input, chunks} = buildServer()
      const body = Buffer.from("somedata");

      server.reactTo('foo', async (msg) => {
        expect(msg.name).to.eql('foo')
        expect(msg.body).to.eql(body)
        return msg.body
      })

      input.push(buildMessage('foo', body))
      await finish(server, input)

      expect(chunks).to.have.length(1)
    })

    it('sends back a response with the same id and propper topic', async () => {
      const { server, input, chunks} = buildServer()
      const body = Buffer.from("somedata");

      const response = Buffer.from('bar');
      server.reactTo('foo', async (_msg) => {
        return response
      })

      input.push(buildMessage('foo', body, 10))
      await finish(server, input)

      expect(chunks).to.have.length(1)
      const msg = Message.parse(chunks[0])

      expect(msg.id).to.eql(10)
      expect(msg.name).to.eql('_response')
      expect(msg.body).to.eql(response)
    })
  });

  it('can execute multiple times', async () => {
    const {server, input} = buildServer()
    const messages: Message[] = []

    const promise = new Promise(resolve => {
      server.listen('foo', async (msg) => {
        messages.push(msg)
        if (messages.length === 3) {
          resolve(null)
        }
      })
    })


    input.push(buildMessage("foo", Buffer.from("")))
    input.push(buildMessage("foo", Buffer.from("")))
    input.push(buildMessage("foo", Buffer.from("")))

    await promise
    expect(messages).to.have.length(3)
  })

  it('can execute different events', async () => {
    const {server, input} = buildServer()
    const messages: Message[] = []

    const eventNames = ['foo', 'foo2', 'foo3'];
    const promises = eventNames.map(async (name) => {
      return new Promise(resolve => {
        server.listen(name, async (msg) => {
          messages.push(msg)
          resolve(name)
        })
      })
    })


    eventNames.forEach(eventName =>
      input.push(buildMessage(eventName, Buffer.from("")))
    )

    await Promise.all(promises)
    expect(messages).to.have.length(3)
    expect(messages.map(m => m.name)).to.have.members(eventNames)
  })
})
