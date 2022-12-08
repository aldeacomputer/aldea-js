import express from 'express'
import cors from 'cors'
import statuses from 'http-status'

import { buildVm } from "./build-vm.js"
import { HttpNotFound } from "./errors.js"
import { Tx } from '@aldea/sdk-js'
import asyncHandler from 'express-async-handler'
import { Address } from "@aldea/sdk-js"

const buildApp = () => {
  const { vm, storage } = buildVm()

  const app = express()

  app.use(express.json())
  app.use(express.raw())
  app.use(cors())

  app.get('/status', (req, res) => {
    res.send({ok: true})
  })

  app.get('/tx/:txid', (req, res) => {
    const txid = req.params.txid
    const tx = storage.getTransaction(txid)
    if (tx) {
      res.set('content-type', 'application/octet-stream')
      const buf = tx.toBytes()
      res.send(Buffer.from(buf))
    } else {
      throw new HttpNotFound(`tx not found: ${txid}`, { txid })
    }
  })

  app.get('/state/:location', (req, res) => {
    const location = req.params.location
    const state = storage.getJigState(location, () => { throw new HttpNotFound(`state not found: ${location}`, { location })})
    const wasm = vm.createWasmInstance(state.packageId)
    res.send(state.objectState(wasm))
  })

  app.post('/tx', asyncHandler(async (req, res) => {
    const tx = Tx.fromBytes(req.body)
    const txResult = await vm.execTx(tx)
    res.send({
      txid: txResult.tx.id,
      deploys: []
    })
  }))

  app.post('/mint', asyncHandler(async (req, res) => {
    const { address, amount } = req.body
    const location = vm.mint(Address.fromString(address), amount)
    res.status(200).json({ location: location.toString() })
  }))

  app.use((err, req, res, _next) => {
    if (err instanceof HttpNotFound) {
      res.status(statuses.NOT_FOUND)
      res.send({
        message: err.message,
        code: 'NOT_FOUND',
        data: err.data
      })
    } else {
      res.status(statuses.BAD_REQUEST)
      res.send({
        message: err.message,
        code: 'unknown error'
      })
    }
  })
  return { app, vm, storage }
}


export { buildApp }
