import express from 'express'

import { VM } from '../vm/vm/vm.js'
import { Storage } from '../vm/vm/storage.js'
import { Transaction } from '../vm/vm/transaction.js'
import { NewInstruction } from '../vm/vm/instructions/new-instruction.js'
import { CallInstruction } from '../vm/vm/instructions/call-instruction.js'
import { LockInstruction } from '../vm/vm/instructions/lock-instruction.js'
import { LiteralArg } from '../vm/vm/literal-arg.js'
import { UserLock } from '../vm/vm/locks/user-lock.js'

const storage = new Storage()
const vm = new VM(storage)

const app = express()
const port = 4000

app.use(express.json())

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
  const tx = new Transaction('tx1')

  json.instructions.forEach(jsonInstruction => {
    switch (jsonInstruction.name) {
      case 'new': {
        const className = jsonInstruction.className
        const argList = jsonInstruction.argList.map(arg => new LiteralArg(arg))
        const instruction = new NewInstruction(className, argList)
        tx.add(instruction)
      } break

      case 'call': {
        const masterListIndex = jsonInstruction.masterListIndex
        const methodName = jsonInstruction.methodName
        const args = jsonInstruction.args.map(arg => new LiteralArg(arg))
        const instruction = new CallInstruction(masterListIndex, methodName, args)
        tx.add(instruction)
      } break

      case 'lock': {
        const jigIndex = jsonInstruction.jigIndex
        const lock = new UserLock(jsonInstruction.lock)
        const instruction = new LockInstruction(jigIndex, lock)
        tx.add(instruction)
      } break

      default:
        throw new Error(`Unknown instruction: ${jsonInstruction.name}`)
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
