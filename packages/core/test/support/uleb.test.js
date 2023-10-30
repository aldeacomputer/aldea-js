import test from 'ava'
import { ulebEncode, ulebDecode } from "../../dist/bcs/uleb.js"

test('uleb of 128', (t) => {
  const res = ulebEncode(128)
  t.deepEqual(res, [128, 1])
})

test('uleb of 255', (t) => {
  const res = ulebEncode(255)
  t.deepEqual(res, [255, 1])
})


test('uleb of 0xffffffff', (t) => {
  const res = ulebEncode(0xffffffff)
  t.deepEqual(res, [255, 255, 255, 255, 15])
})


test('parse 255, 255, 255, 255, 15 returns 0xffffffff', t => {
  const res = ulebDecode([255, 255, 255, 255, 15])
  t.deepEqual(res.value, 0xffffffff)
  t.deepEqual(res.length, 5)
})
