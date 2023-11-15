import minimist from 'minimist'
import { logger } from './globals.js'
import { buildApp } from './server.js'
import { startNode, stopNode } from './p2p/node.js'

const PORT = process.env.PORT ?? 4000

// Parse CLI args
const argv = minimist(process.argv.slice(2), {
  alias: { peer: ['p'] },
  boolean: ['p2p'],
  string: ['_']
})

const { app, p2p } = await buildApp(argv)

const server = app.listen(PORT, () => {
  app.set('started-at', Date.now())
  logger.info(`Listening on port ${PORT}`)
})

if (p2p != null) {
  server.on('listening', () => { startNode(p2p).catch(() => {}) })
  server.on('close', () => { stopNode(p2p).catch(() => {}) })

  p2p.addEventListener('peer:connect', (e) => {
    logger.info('🤝 Connected to: %s', e.detail.remotePeer.toString())
  })

  p2p.addEventListener('peer:disconnect', (e) => {
    logger.info('👋 Disconnected from: %s', e.detail.remotePeer.toString())
  })
}

function stop (): void {
  server.close()
  setTimeout(() => {
    logger.info('👋 Goodbye')
    process.exit()
  })
}

process.on('SIGTERM', stop)
process.on('SIGINT', stop)
