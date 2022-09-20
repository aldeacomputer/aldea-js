import express from 'express'

import { VM } from '../vm/vm/vm.js'
import { Storage } from '../vm/vm/storage.js'
import { Transaction } from '../vm/vm/transaction.js'
import { NewInstruction } from '../vm/vm/instructions/new-instruction.js'
import { CallInstruction } from '../vm/vm/instructions/call-instruction.js'
import { LockInstruction } from '../vm/vm/instructions/lock-instruction.js'
import { LiteralArg } from '../vm/vm/literal-arg.js'
import { UserLock } from '../vm/vm/locks/user-lock.js'

const app = express()
const port = 4000

app.use(express.json())

// TEST SETUP
const storage = new Storage()
const tx = new Transaction('tx1')
const lock = new UserLock('02e87f8ac25172cbc2f6e3fc858c970e0668a9c359452a4ef80e552db9cd9d987a')
tx.add(new NewInstruction('v1/sword.wasm', [new LiteralArg('excalibur')]))
tx.add(new CallInstruction(0, 'sharp', []))
tx.add(new LockInstruction(0, lock))
const vm = new VM(storage)
vm.execTx(tx)

app.get('/status', (req, res) => {
  res.send('OK')
})

app.get('/tx/:txid', (req, res) => {
  // TODO
  res.send('OK')
})

app.get('/state/:location', (req, res) => {
  const state = storage.getJigState(req.params.location)
  if (state) {
    res.send(state)
  } else {
    res.status(404).send("Sorry can't find that!")
  }
})

function parseTransactionJson (json) {
  const tx = new Transaction('tx2')

  json.instructions.forEach(instruction => {
    switch (instruction.name) {
      case 'new': {
        console.log('new')
      } break

      case 'lock': {
        console.log('new')
      } break

      default:
        throw new Error(`Unknown instruction: ${instruction.name}`)
    }
  })

  return tx
}

app.post('/tx', (req, res) => {
  try {
    const tx = parseTransactionJson(req.body)
    vm.execTx(tx)
    res.send('OK')
  } catch (e) {
    res.status(400).send(e.message)
  }
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
