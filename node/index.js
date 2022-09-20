const express = require('express')
const app = express()
const port = 4000

app.get('/status', (req, res) => {
  res.send('OK')
})

app.get('/tx/:txid', (req, res) => {
  // TODO
  res.send('OK')
})

app.get('/state/:location', (req, res) => {
  // TODO
  res.send('OK')
})

app.post('/tx', (req, res) => {
  // TODO
  res.send('OK')

  /**
   * Example JSON tx to instantiate a sword
   *
   * {
   *      instructions: [
   *          {
   *              name: 'new',
   *              className: 'v1/sword.wasm'
   *              argList: ['excalibur']
   *          },
   *          {
   *              name: 'lock',
   *              jigIndex: 0,
   *              lock: '1EPSihtxLkiXc3NPRHucZpFUoLDWWwETn4'
   *          }
   *      ]
   * }
   */
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
