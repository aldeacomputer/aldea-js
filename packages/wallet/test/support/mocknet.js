import { buildApp } from '@aldea/mocknet'
import { MomentClock } from '@aldea/vm'

const PORT = 4004

export async function startMocknet(port) {
  const { app } = await buildApp(new MomentClock())

  // Remove the logger for tests
  const loggerIdx = app._router.stack.findIndex(m => m.name === 'logger')
  app._router.stack.splice(loggerIdx, 1)

  return new Promise(resolve => {
    const server = app.listen(port, () => resolve(server))
  })
}

export function randomPort() {
  return Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1) + MIN_PORT)
}

//await startMocknet(PORT)
