import { ParsedArgs } from 'minimist'
import { createLibp2p, Libp2p } from 'libp2p'
import { bootstrap } from '@libp2p/bootstrap'
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { tcp } from '@libp2p/tcp'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { config, logger } from '../globals.js'

/**
 * Creates a new instance of Libp2p
 */
export async function createNode (argv: ParsedArgs = { _: [] }): Promise<Libp2p> {
  return await createLibp2p({
    // config
    addresses: {
      listen: config.listen_addrs
    },
    connectionManager: {
      // todo - lots of configurable options here
    },
    nat: {
      enabled: config.nat_enabled
    },
    relay: {
      enabled: true
    },
    // layers
    connectionEncryption: plugConnectionEncryption(argv),
    peerDiscovery: plugPeerDiscovery(argv),
    pubsub: plugPubSub(argv),
    streamMuxers: plugStreamMuxers(argv),
    transports: plugTransports(argv)
  })
}

// Start function
export async function startNode (node: Libp2p): Promise<void> {
  await node.start()
  if (node.isStarted()) {
    logger.info('🟢 Node started: %s', node.peerId.toString())
    node.getMultiaddrs().forEach((addr) => {
      logger.info('🌍 Listening on: %s', addr.toString())
    })
  }
}

// Stop function
export async function stopNode (node: Libp2p): Promise<void> {
  await node.stop()
  if (!node.isStarted()) {
    logger.info('🔴 Node stopped: %s', node.peerId.toString())
  }
}

// Hacked type
type Libp2pPlug = (components: any) => any

// Plugs a list of connection encryptor components
function plugConnectionEncryption (argv: ParsedArgs): Libp2pPlug[] {
  return [
    noise()
  ]
}

// Plugs a list of peer discovery components
function plugPeerDiscovery (argv: ParsedArgs): Libp2pPlug[] {
  const plugs: Libp2pPlug[] = []

  let peers: string[] = []
  if (Array.isArray(argv.peer)) peers = argv.peer
  if (typeof argv.peer === 'string') peers = [argv.peer]

  if (peers.length > 0) {
    plugs.push(bootstrap({
      list: peers
    }))
  }

  plugs.push(pubsubPeerDiscovery({
    interval: 20000
  }))

  return plugs
}

// Plugs a pubsub component
function plugPubSub (argv: ParsedArgs): Libp2pPlug {
  return gossipsub({
    allowPublishToZeroPeers: true,
    fallbackToFloodsub: false
  })
}

// Plugs a list of stream muxer components
function plugStreamMuxers (argv: ParsedArgs): Libp2pPlug[] {
  return [
    yamux()
  ]
}

// Plugs a list of transport components
function plugTransports (argv: ParsedArgs): Libp2pPlug[] {
  return [
    tcp()
  ]
}
