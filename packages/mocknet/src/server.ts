import express from 'express'
import { Express, Request, Response, NextFunction } from 'express'
import { ParsedArgs } from 'minimist'
import cors from 'cors'
import statuses from 'http-status'
import morgan from 'morgan'
import asyncHandler from 'express-async-handler'
import { Libp2p } from 'libp2p'
import { CompileError } from "@aldea/compiler"
import { VM, Storage, Clock,  } from "@aldea/vm"
import { JigState } from '@aldea/vm/jig-state'
import { ExecutionResult } from '@aldea/vm/execution-result'
import { Address, base16, Pointer, Tx, instructions, abiToBin, abiToJson, BCS } from "@aldea/sdk-js"
import { buildVm } from "./build-vm.js"
import { HttpNotFound } from "./errors.js"
import { logStream, logger } from './globals.js'
import { createNode } from './p2p/node.js'

const { LoadInstruction, CallInstruction, LockInstruction, SignInstruction, FundInstruction } = instructions

export interface iApp {
  app: Express;
  p2p?: Libp2p;
  storage: Storage;
  vm: VM;
}

export async function buildApp(clock: Clock, argv: ParsedArgs = {'_': []}): Promise<iApp> {
  const { vm, storage, minterPriv, coinOrigin } = await buildVm(clock)
  const p2p: Libp2p | undefined = argv.p2p ? await createNode(argv) : undefined

  const serializeJigState = (jigState: JigState) => {
    const lock = jigState.serializedLock
    return {
      id: base16.encode(jigState.id()),
      origin: jigState.origin.toString(),
      location: jigState.currentLocation.toString(),
      class: jigState.classPtr().toString(),
      lock: {
        type: lock.type,
        data: lock.data ? base16.encode(lock.data) : ''
      },
      state: base16.encode(jigState.stateBuf),
      created_at: jigState.createdAt
    }
  }

  const serializeExecResult = (txExec: ExecutionResult) => {
    return {
      id: txExec.tx.id,
      rawtx: txExec.tx.toHex(),
      packages: txExec.deploys.map((pkg) => {
        const pkgId = base16.encode(pkg.hash)
        const data = storage.getModule(pkg.hash, () => {

          throw new HttpNotFound(`Unknown package: ${pkgId}`, { pkg_id: pkgId })
        })
        return {
          id: pkgId,
          files: Array.from(data.sources.entries()).map(([key, value]) => { return { name: key, content: value } }),
          entries: data.entries
        }
      }),
      outputs: txExec.outputs.map(o => serializeJigState(o)),
      executed_at: txExec.executedAt
    }
  }

  const app = express()

  app.use(morgan('tiny', { stream: logStream }))
  app.use(express.json())
  app.use(express.raw())
  app.use(cors())

  app.get('/status', (_req, res) => {
    res.send({ok: true})
  })

  app.post('/tx', asyncHandler(async (req, res) => {
    const tx = Tx.fromBytes(new Uint8Array(req.body))
    const txResult = await vm.execTx(tx)
    emitTx(tx)
    res.send(serializeExecResult(txResult))
  }))

  app.get('/tx/:txid', (req, res) => {
    const txid = req.params.txid
    const exec = storage.getTransaction(txid)
    if (!exec) {
      throw new HttpNotFound(`unknown tx: ${txid}`, { txid })
    }
    res.status(200).send(serializeExecResult(exec))
  })

  app.get('/rawtx/:txid', (req, res) => {
    const txid = req.params.txid
    const exec = storage.getTransaction(txid)
    if (!exec) {
      throw new HttpNotFound(`unknown tx: ${txid}`, { txid })
    }
    res.set('content-type', 'application/octet-stream')
    res.status(200).send(Buffer.from(exec.tx.toBytes()))
  })

  app.get('/state/:outputId', (req, res) => {
    const outputId = req.params.outputId
    const state = storage.getHistoricalUtxo(
      base16.decode(outputId),
      () => { throw new HttpNotFound(`state not found: ${outputId}`, { outputId })}
    )
    const wasm = storage.wasmForPackageId(state.packageId)
    res.send({
      state: state.objectState(wasm)
    })
  })

  app.get('/output/:outputId', (req, res) => {
    const outputId = req.params.outputId
    const jigState = storage.getHistoricalUtxo(
      base16.decode(outputId),
      () => { throw new HttpNotFound(`${outputId} not found`, { outputId })}
    )
    res.status(200).send(serializeJigState(jigState))
  })

  app.get('/output-by-origin/:origin', (req, res) => {
    const origin = req.params.origin
    const jigState = storage.getJigStateByOrigin(
      Pointer.fromString(origin)
    ).orElse(() => { throw new HttpNotFound(`${origin} not found`, { origin })})
    res.status(200).send(serializeJigState(jigState))
  })

  app.get('/utxos-by-address/:address', (req, res) => {
    const addressStr = req.params.address
    const address = Address.fromString(addressStr)
    res.send(
      storage.utxosForAddress(address).map(u => serializeJigState(u))
    )
  })

  app.post('/mint', asyncHandler(async (req, res) => {
    const coinPkg = storage.getModule(base16.decode('0000000000000000000000000000000000000000000000000000000000000000'), (pkgId) => {
      throw new HttpNotFound('coin pkg not found', { package_id: pkgId })
    })
    const bcs = new BCS(coinPkg.abi)
    const { address, amount } = req.body
    const coinLocation = storage.tipFor(coinOrigin)
    const tx = new Tx()
    tx.push(new LoadInstruction(coinLocation))
    tx.push(new CallInstruction(0, 1, bcs.encode('Coin$send', [amount])))
    tx.push(new CallInstruction(0, 1, bcs.encode('Coin$send', [200])))
    tx.push(new FundInstruction(2))
    tx.push(new LockInstruction(1, Address.fromString(address).hash))
    tx.push(new SignInstruction(tx.createSignature(minterPriv), minterPriv.toPubKey().toBytes()))

    const result = await vm.execTx(tx)
    emitTx(tx)

    const coinOutput = result.outputs[1]
    if (!coinOutput) {
      throw new Error('coin output should exist')
    }
    res.status(200).json(serializeJigState(coinOutput))
  }))

  app.get('/package/:packageId/abi.:format', (req, res) => {
    const {packageId, format} = req.params

    const data = storage.getModule(base16.decode(packageId), (pkgId) => {
      throw new HttpNotFound(`package with id ${pkgId} not found`, { package_id: packageId })
    })
    if (!data) {

    }
    if (format === 'json' || !format) {
      res.set('content-type', 'application/json')
      res.status(200).send(abiToJson(data.abi))
    } else if (format === 'bin') {
      res.set('content-type', 'application/octet-stream')
      res.status(200).send(abiToBin(data.abi))
    } else {
      throw new Error(`unknown format: ${format}`)
    }
  })

  app.get('/package/:packageId/source', (req, res) => {
    const {packageId} = req.params
    const data = storage.getModule(base16.decode(packageId), () => {
      throw new HttpNotFound(`package with id ${packageId} not found`, { package_id: packageId })
    })
    const pkgData = BCS.pkg.encode([data.entries, data.sources])
    res.set('content-type', 'application/octet-stream')
    res.send(pkgData)
  })

  app.get('/package/:packageId/wasm', (req, res) => {
    const {packageId} = req.params
    const data = storage.getModule(base16.decode(packageId), () => {
      throw new HttpNotFound(`package with id ${packageId} not found`, { package_id: packageId })
    })
    res.set('content-type', 'application/wasm')
    res.send(Buffer.from(data.wasmBin))
  })

  app.get('/package/:packageId/docs', (req, res) => {
    const {packageId} = req.params
    const data = storage.getModule(base16.decode(packageId), () => {
      throw new HttpNotFound(`package with id ${packageId} not found`, { package_id: packageId })
    })
    res.set('content-type', 'application/json')
    res.send(JSON.parse(Buffer.from(data.docs).toString()))
  })

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
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
          message: err.stderr.toString()
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

  function emitTx(tx: Tx): void {
    if (p2p?.isStarted()) {
      logger.info('⬆️ Outbound TX: %s', tx.id)
      p2p.pubsub.publish('tx', tx.toBytes())
    }
  }

  if (p2p) {
    p2p.pubsub.subscribe('tx')
    p2p.pubsub.addEventListener('message', async e => {
      if (e.detail.topic === 'tx') {
        try {
          const tx = Tx.fromBytes(e.detail.data)
          logger.info('⬇️ Inbound TX: %s', tx.id)
          await vm.execTx(tx)
        } catch(e: any) {
          logger.error('❌ Error: %s', e.message)
        }
      }
    })
  }

  return { app, p2p, storage, vm }
}
