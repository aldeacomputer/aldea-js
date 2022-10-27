import {
  Storage,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {CBOR} from "cbor-redux";
import {TxExecution} from "../vm/tx-execution.js";
import {NoLock} from "../vm/locks/no-lock.js";
import {Transaction} from "@aldea/sdk-js";

const parse = (data: ArrayBuffer) => CBOR.decode(data, null, { mode: "sequence" }).data

describe('TxExecution', () => {
  it('can call methods directly', () => {
    const vm = new VM(new Storage())
    const exec = new TxExecution(new Transaction(), vm)
    const modId = vm.addPreCompiled('aldea/flock.wasm', 'aldea/flock.ts')
    exec.loadModule(modId)

    const jigRef = exec.instantiate('aFlock', modId, 'Flock', [], new NoLock())

    jigRef.sendMessage('grow', [], exec)

    const state = parse(jigRef.serialize())
    expect(state[0]).to.eql(1)
  })
})
