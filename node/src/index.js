import express from 'express'
import cors from 'cors'
import cbor from 'cbor'

import { VM, Storage } from '@aldea/vm'
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
    const moduleId = state.moduleId
    const wasm = vm.createWasmInstance(moduleId)
    const exports = wasm.instance.exports
    const schemaFunctionName = `${state.className}_schema`
    const schemaPointer = exports[schemaFunctionName]()
    const schemaBuffer = wasm.__liftBuffer(schemaPointer)
    const schema = cbor.decode(schemaBuffer)
    const values = cbor.decodeAllSync(Buffer.from(state.stateBuf))
    const stateJson = {}
    Object.entries(schema).forEach(([name, type], index) => {
      stateJson[name] = values[index]
    })
    state.stateJson = stateJson
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
    res.send({ txid: tx.id })
  } catch (e) {
    res.status(400).send(e.message)
  }
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
