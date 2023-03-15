import { PrivKey } from '@aldea/sdk-js'
import { pino } from 'pino'
import pretty from 'pino-pretty'
import { PinoPretty } from 'pino-pretty'

/**
 * Configuration interface
 */
export interface Config {
  /** List of maddrs to listen on */
  listen_addrs: string[];

  /** Hex-encoded 32-byte ed25519 private key. Defaults to randomly generated key. */
  peer_key: string;

  /** Enable NAT traversal. Defaults to false. */
  nat_enabled: boolean;
}

// Default configuration
const defaults: Config = {
  listen_addrs: [
    '/ip4/0.0.0.0/tcp/41410'
  ],
  peer_key: PrivKey.fromRandom().toHex(),
  nat_enabled: false,
}


/**
 * Self invoking expression that exports global config object.
 */
export const config: Config = (() => {
  return Object.entries(defaults).reduce<Record<string, any>>((config, [key, val]) => {
    const env = process.env[key.toUpperCase()]
    if (typeof env === 'undefined')   { config[key] = val }
    else if (Array.isArray(val))      { config[key] = env.split(',').map(s => s.trim()) }
    else if (typeof val === 'number') { config[key] = Number(env) }
    else { config[key] = env } 
    return config
  }, {}) as Config
})()


/**
 * Global shared logger stream
 */
// @ts-ignore
export const logStream: PinoPretty.PrettyStream = pretty({ colorize: true })


/**
 * Global logger instance. 
 */
export const logger = pino(logStream)
