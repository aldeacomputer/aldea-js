import { buildApp } from './server.js'
import {MomentClock} from "@aldea/vm";

const port = process.env.PORT || 4000

const { app } = buildApp(new MomentClock())

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
