#!/usr/bin/env node
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { compileCmd } from '../dist/compiler.js'

await yargs(hideBin(process.argv))
  .scriptName('aldea')
  .command(compileCmd)
  .parse()
