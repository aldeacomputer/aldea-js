import { Config as CompleteConfig } from './config.js'
import { env } from './globals.js'
export * from './log.js'

export type Config = Partial<CompleteConfig>
export { env }
