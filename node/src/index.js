import express from 'express'
import cors from 'cors'

import { VM } from '../../vm/vm/vm.js'
import { Storage } from '../../vm/vm/storage.js'
import { TransactionJSON } from './transaction-json.js'

const storage = new Storage()
const vm = new VM(storage)

const app = express()
const port = process.env.PORT || 4000

app.use(express.json())
app.use(cors())

app.get('/status', (req, res) => {
  res.send('OK')
})

app.get('/tx/:txid', (req, res) => {
  const tx = storage.getTransaction(req.params.txid)
  if (tx) {
    res.send(tx)
  } else {
    res.status(404).send("Sorry can't find that!")
  }
})

app.get('/state/:location', (req, res) => {
  const state = storage.getJigState(req.params.location)
  if (state) {
    res.send(state)
  } else {
    res.status(404).send("Sorry can't find that!")
  }
})

app.post('/tx', (req, res) => {
  try {
    const tx = TransactionJSON.parse(req.body)
    vm.execTx(tx)
    storage.addTransaction(tx)
    res.send(tx.id)
  } catch (e) {
    res.status(400).send(e.message)
  }
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
