import {expect} from 'chai'
import {StreamReader} from "../src/stream-reader.js";

it('can read by chunks', async () => {
  const buf1 = Buffer.from('12')
  const buf2 = Buffer.from('345')
  const buf3 = Buffer.from('6789')
  const reader = new StreamReader(buf1)
  reader.push(buf2)
  reader.push(buf3)
  const buf = await reader.take(9);
  expect(buf.toString()).to.eql('123456789')
})

it('can read by delayed chunks', async () => {
  const buf1 = Buffer.from([1, 2])
  const buf2 = Buffer.from([3, 4, 5])
  const buf3 = Buffer.from([6 ,7, 8, 9])
  const reader = new StreamReader(buf1)

  const promise1 = reader.take(3);
  const promise2 = reader.take(3);
  const promise3 = reader.take(3);
  await new Promise(resolve => setTimeout(resolve, 0))
  reader.push(buf2)
  reader.push(buf3)
  const bufs = await Promise.all([promise1, promise2, promise3])
  expect(bufs[0]).to.eql(Buffer.from([1,2,3]))
  expect(bufs[1]).to.eql(Buffer.from([4,5,6]))
  expect(bufs[2]).to.eql(Buffer.from([7,8,9]))
})
