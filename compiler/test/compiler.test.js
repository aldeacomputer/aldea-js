import test from 'ava'
import { compile } from '../dist/compiler.js'

test('a simple test', async t => {
  const res = await compile(`
  export class Token {
    amount: u64;
    constructor(amount: u64) { this.amount = amount }
  }
  `)
  t.true(res.output.abi instanceof Uint8Array)
  t.true(res.output.wasm instanceof Uint8Array)
  t.true(typeof res.output.wat === 'string')
  //console.log(res)
  t.pass()
})