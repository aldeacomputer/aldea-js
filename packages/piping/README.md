# @aldea/piping

This library implements a simple protocol to make 2 processes interact through stdin and stdout.

## How to use it

```js
// parent.js
import { PipeServer } from '@aldea/pipping' 
import spawn from 'child_process'

const childProcess = spawn('node', ['./child.js'])

const server = new PipeServer(childProcess.stdout, childProcess.stdin)
server.start()

const client = server.client

const pong = await client.sendWithResponse('ping', Buffer.from(randomData))
console.log(`Response recieved: ${pong}`)
```

```js
// child.js
import {PipeServer} from '@aldea/pipping'

const server = new PipeServer(process.stdin, process.stdout)

server.reactTo('ping', (msg) => {
    return Buffer.from(`pong!, ${msg.body.toString()}`)
})

server.start()
```

Both, the parent and the child need to craete a server object. Because it's needed to receive
responses from the othe side of the communication.

## Protocol.

The protocol is simple. Each event has an id, a name and a body. All of that gets encoded in the following way:

- protocol identifer: the word `aldea` in ascii. 5 bytes.
- the length of the name of the event. 4 bytes.
- the length of the body.4 bytes.
- the id. 4 bytes.
- the name of the event
- the body of the event.



