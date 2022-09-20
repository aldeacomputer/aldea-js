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

  /**
   *
   * {
   *      instructions: [
   *          {
   *              name: '...'
   *          }
   *      ]
   * }
   */
  res.send('OK')
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
