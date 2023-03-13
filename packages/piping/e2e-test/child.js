import {PipeServer} from '../dist/index.js'

const server = new PipeServer(process.stdin, process.stdout)
server.start()

server.reactTo('ping', (msg) => {
  return Buffer.from(`pong!, ${msg.body.toString()}`)
})
