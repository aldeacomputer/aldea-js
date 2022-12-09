import { buildApp } from './server.js'

const port = process.env.PORT || 4000

const { app } = buildApp()

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
