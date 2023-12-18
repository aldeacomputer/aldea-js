import express, { Express, Request, Response, NextFunction } from 'express'
import { ParsedArgs } from 'minimist'
import cors from 'cors'
import statuses from 'http-status'
import morgan from 'morgan'
import asyncHandler from 'express-async-handler'
import { Libp2p } from 'libp2p'
import { CompileError } from '@aldea/compiler'
import { VM, Storage, PackageDeploy } from '@aldea/vm'
import { ExecutionResult } from '@aldea/vm/execution-result'
import {Address, base16, Pointer, Tx, abiToBin, abiToJson, BCS, ed25519, Output} from '@aldea/core'
import { buildVm } from './build-vm.js'
import { HttpNotFound } from './errors.js'
import { logStream, logger } from './globals.js'
import { createNode } from './p2p/node.js'
import { LoadInstruction, CallInstruction, LockInstruction, SignInstruction, FundInstruction } from '@aldea/core/instructions'

export interface iApp {
  app: Express
  p2p?: Libp2p
  storage: Storage
  vm: VM
}

export async function buildApp (argv: ParsedArgs = { _: [] }): Promise<iApp> {
  const { vm, storage, minterPriv, coinOrigin } = await buildVm()
  const p2p: Libp2p | undefined = argv.p2p !== undefined ? await createNode(argv) : undefined

  const serializeOutput = (output: Output): object => {
    return {
      id: output.id,
      origin: output.origin.toString(),
      location: output.location.toString(),
      class: output.classPtr.toString(),
      lock: {
        type: output.lock.type,
        data: base16.encode(output.lock.data)
      },
      state: base16.encode(output.stateBuf)
    }
  }

  const serializeExecResult = (execRes: ExecutionResult, tx: Tx): object => {
    return {
      id: execRes.txId,
      rawtx: tx.toHex(),
      packages: execRes.deploys.map((pkg: PackageDeploy) => {
        const files = [...pkg.sources.entries()]
            .map(([key, value]) => ({ name: key, content: value }) );
        return {
          id: pkg.id,
          files,
          entries: pkg.entries
        }
      }),
      outputs: execRes.outputs.map((o: Output) => serializeOutput(o)),
      spends: execRes.spends.map((s: Output) => s.id),
      reads: execRes.reads.map((r: Output) => r.id)
    }
  }

  const app = express()

  app.use(morgan('tiny', { stream: logStream }))
  app.use(express.json())
  app.use(express.raw())
  app.use(cors())

  app.get('/status', (_req, res) => {
    const startedAt = app.get('started-at')
    res.send({ ok: true, since: startedAt })
  })

  app.post('/tx', asyncHandler(async (req, res) => {
    const tx = Tx.fromBytes(new Uint8Array(req.body))
    // if (!tx.verify()) {
    //   throw new Error(`invalid tx signatures: ${tx.id}`)
    // }
    const txResult = await vm.execTx(tx)
    emitTx(tx)
    res.send(serializeExecResult(txResult, tx))
  }))

  app.get('/tx/:txid', (req, res) => {
    const txid = req.params.txid
    const exec = storage.getExecResult(txid).expect(
        new HttpNotFound(`Exec result not found for tx id: ${txid}`, { txid })
    )
    const tx = storage.getTx(txid).expect(
        new HttpNotFound(`Tx not found for id: ${txid}`, { txid })
    )

    res.status(200).send(serializeExecResult(exec, tx))
  })

  app.get('/rawtx/:txid', (req, res) => {
    const txid = req.params.txid
    const tx = storage.getTx(txid).expect(
        new HttpNotFound(`Tx not found for id: ${txid}`, { txid })
    )

    res.set('content-type', 'application/octet-stream')
    res.status(200).send(Buffer.from(tx.toBytes()))
  })

  app.get('/output/:outputId', (req, res) => {
    const outputId = req.params.outputId
    const jigState = storage.getHistoricalUtxo(
      base16.decode(outputId)
    ).expect(new HttpNotFound(`${outputId} not found`, { outputId }))
    res.status(200).send(serializeOutput(jigState))
  })

  app.get('/output-by-origin/:origin', (req, res) => {
    const origin = req.params.origin
    const jigState = storage.getJigStateByOrigin(
      Pointer.fromString(origin)
    ).orElse(() => { throw new HttpNotFound(`${origin} not found`, { origin }) })
    res.status(200).send(serializeOutput(jigState))
  })

  app.get('/utxos-by-address/:address', (req, res) => {
    const addressStr = req.params.address
    const address = Address.fromString(addressStr)
    res.send(
      storage.utxosForAddress(address).map((u: Output) => serializeOutput(u))
    )
  })

  app.get('/outputs-by-lock/:lock', (req, res) => {
    const lockHex = req.params.lock
    res.send(
      storage.utxosForLock(lockHex).map((u: Output) => serializeOutput(u))
    )
  })

  app.post('/mint', asyncHandler(async (req, res) => {
    const coinPkg = storage.getPkg('0000000000000000000000000000000000000000000000000000000000000000').get()
    const bcs = new BCS(coinPkg.abi)
    const { address, amount } = req.body
    const coinLocation = storage.tipFor(coinOrigin)
    const tx = new Tx()
    tx.push(new LoadInstruction(coinLocation))
    tx.push(new CallInstruction(0, 0, bcs.encode('Coin_send', [amount])))
    tx.push(new CallInstruction(0, 0, bcs.encode('Coin_send', [200])))
    tx.push(new FundInstruction(2))
    tx.push(new LockInstruction(1, Address.fromString(address).hash))
    tx.push(new SignInstruction(new Uint8Array(), minterPriv.toPubKey().toBytes()))
    ;(tx.instructions[5] as SignInstruction).sig = ed25519.sign(tx.sighash(), minterPriv)

    const result = await vm.execTx(tx)
    emitTx(tx)

    const coinOutput = result.outputs.at(1)
    if (coinOutput == null) {
      throw new Error('coin output should exist')
    }
    res.status(200).json(serializeOutput(coinOutput))
  }))

  app.get('/package/:packageId/abi.:format', (req, res) => {
    const { packageId, format } = req.params

    const data = storage.getPkg(packageId).expect(
        new HttpNotFound(`package with id ${packageId} not found`, { package_id: packageId })
    )

    if (format === 'json' || format.length === 0) {
      res.set('content-type', 'application/json')
      res.status(200).send(abiToJson(data.abi))
    } else if (format === 'bin') {
      res.set('content-type', 'application/octet-stream')
      res.status(200).send(Buffer.from(abiToBin(data.abi)))
    } else {
      throw new Error(`unknown format: ${format}`)
    }
  })

  app.get('/package/:packageId/source', (req, res) => {
    const { packageId } = req.params
    const data = storage.getPkg(packageId).expect(new HttpNotFound(`package with id ${packageId} not found`, { package_id: packageId }))
    const pkgData = BCS.pkg.encode([data.entries, data.sources])
    res.set('content-type', 'application/octet-stream')
    res.send(Buffer.from(pkgData))
  })

  app.get('/package/:packageId/wasm', (req, res) => {
    const { packageId } = req.params
    const data = storage.getPkg(packageId).expect(new HttpNotFound(`package with id ${packageId} not found`, { package_id: packageId }))
    res.set('content-type', 'application/wasm')
    res.send(Buffer.from(data.wasmBin))
  })

  app.get('/package/:packageId/docs', (req, res) => {
    const { packageId } = req.params
    const data = storage.getPkg(packageId).expect(new HttpNotFound(`package with id ${packageId} not found`, { package_id: packageId }))
    res.set('content-type', 'application/json')
    res.send(JSON.parse(Buffer.from(data.docs).toString()))
  })

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpNotFound) {
      res.status(statuses.NOT_FOUND)
      res.send({
        message: err.message,
        code: 'NOT_FOUND',
        data: err.data
      })
    } else if (err instanceof CompileError) {
      res.status(statuses.BAD_REQUEST)
      res.send({
        message: 'there was an error compiling a package',
        code: 'COMPILE_ERROR',
        data: {
          message: err.stderr.toString() // eslint-disable-line
        }
      })
    } else {
      logger.error(err)
      res.status(statuses.BAD_REQUEST)
      res.send({
        message: err.message,
        code: 'BAD_REQUEST'
      })
    }
  })

  function emitTx (tx: Tx): void {
    if (p2p == null) { return }
    if (p2p.isStarted()) {
      logger.info('⬆️ Outbound TX: %s', tx.id)
      p2p.pubsub.publish('tx', tx.toBytes()).catch(() => {})
    }
  }

  if (p2p != null) {
    p2p.pubsub.subscribe('tx')
    p2p.pubsub.addEventListener('message', e => {
      if (e.detail.topic === 'tx') {
        try {
          const tx = Tx.fromBytes(e.detail.data)
          logger.info('⬇️ Inbound TX: %s', tx.id)
          vm.execTx(tx).catch(() => {})
        } catch (e: any) {
          logger.error('❌ Error: %s', e.message)
        }
      }
    })
  }

  return { app, p2p, storage, vm }
}
