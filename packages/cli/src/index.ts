import { Config as CompleteConfig } from './config.js'
import { env } from './globals.js'
export * from './log.js'

// TODO
export type Config = Partial<CompleteConfig>
export { env }
