import test from 'ava'

import { Aldea } from '../dist/aldea.js'

test('can pre-cache the api client', async t => {
  const aldea = new Aldea('localhost')
  aldea.cache.set('http://localhost/foo', new Response(JSON.stringify({ foo: 'bar' })))
  const res = await aldea.api.get('foo').json()
  t.is(res.foo, 'bar')
})
