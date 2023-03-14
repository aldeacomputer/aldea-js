import {PipeServer} from '../dist/index.js'

const server = new PipeServer(process.stdin, process.stdout)

server.reactTo('ping', (msg) => {
  return Buffer.from(`pong!, ${msg.body.toString()}`)
})

server.start()
