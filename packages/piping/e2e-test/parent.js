import {PipeServer} from '../dist/index.js'
import {spawn} from 'child_process'

const childProcess = spawn('node', ['./e2e-test/child.js'])


const server = new PipeServer(childProcess.stdout, childProcess.stdin)
server.start()
const client = server.client

while (true) {
  const randomData = Math.random().toString()
  console.log(`Sending ping with ${randomData}`)
  const pong = await client.sendWithResponse('ping', Buffer.from(randomData))
  console.log(`Response recieved: ${pong}`)
  await new Promise(resolve => setTimeout(resolve, 1500))
}


