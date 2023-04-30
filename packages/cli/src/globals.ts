import { join } from 'path'
import { Config, defaultConfig } from './config.js'
import { Env } from './env.js'

const conf: Partial<Config> = await loadConfig('aldea.config.cjs')
const config: Config = { ...defaultConfig, ...conf }

/**
 * Global CLI environment instance
 */
export const env: Env = new Env(config)

// Loads configuration from the working directory
async function loadConfig(fileName: string): Promise<Partial<Config>> {
  const path = join(join(process.cwd(), fileName))
  const conf: Partial<Config> = await import(path).then(c => c.default).catch(e => ({}))

  // Sanitize
  for (const key in conf) {
    if (!Object.hasOwn(defaultConfig, key)) {
      delete conf[<keyof Config>key]
    }
  }

  return conf
}
