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

// TEST
const storage = new Storage()
const tx = new Transaction('tx1')
const lock = new UserLock('02e87f8ac25172cbc2f6e3fc858c970e0668a9c359452a4ef80e552db9cd9d987a')
tx.add(new NewInstruction('v1/sword.wasm', [new LiteralArg('excalibur')]))
tx.add(new CallInstruction(0, 'sharp', []))
tx.add(new LockInstruction(0, lock))
const vm = new VM(storage)
vm.execTx(tx)
console.log(storage.getJigState('tx1_0'))

app.get('/status', (req, res) => {
  res.send('OK')
})

app.get('/tx/:txid', (req, res) => {
  // TODO
  res.send('OK')
})

app.get('/state/:location', (req, res) => {
  // TODO
  res.send('OK')
})

app.post('/tx', (req, res) => {
  // TODO
  res.send('OK')

  /**
   * Example JSON tx to instantiate a sword
   *
   * {
   *      instructions: [
   *          {
   *              name: 'new',
   *              className: 'v1/sword.wasm'
   *              argList: ['excalibur']
   *          },
   *          {
   *              name: 'lock',
   *              jigIndex: 0,
   *              lock: '02e87f8ac25172cbc2f6e3fc858c970e0668a9c359452a4ef80e552db9cd9d987a'
   *          }
   *      ]
   * }
   */
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
