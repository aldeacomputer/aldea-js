import test from 'ava'
import { mockProgram } from '../support/mock-program.js'


test('foo bar', async t => {
  const mock = mockProgram('export function sum(a: i32, b: i32): i32 { return a + b }')
  // console.log(mock.pgm)

  t.pass()
})
