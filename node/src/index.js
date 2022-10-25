import express from 'express'
import cors from 'cors'

import { TransactionJSON } from './transaction-json.js'
import { buildVm } from "./build-vm.js"

const { vm, storage } = buildVm()

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
    res.send(TransactionJSON.toJSON(tx))
  } else {
    res.status(404).send("Sorry can't find that!")
  }
})

app.get('/state/:location', (req, res) => {
  const state = storage.getJigState(req.params.location)
  if (state) {
    const wasm = vm.createWasmInstance(state.moduleId)
    res.send(state.objectState(wasm))
  } else {
    res.status(404).send("Sorry can't find that!")
  }
})

app.post('/tx', (req, res) => {
  try {
    const tx = TransactionJSON.parse(req.body)
    const execution = vm.execTx(tx)
    storage.persist(execution)
    res.send({ txid: tx.id })
  } catch (e) {
    console.error(e)
    res.status(400).send(e.message)
  }
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
