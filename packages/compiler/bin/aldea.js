#!/usr/bin/env node
import { program } from 'commander'
import { compileCommand } from '../dist/compiler.js'
import { printVersion } from "../dist/print-version.js"

program
  .name('aldea')
  .showHelpAfterError()

program
  .command('compile')
  .argument('<src>', 'assemblyscript source')
  .option('-o --output <output>', 'wasm output path')
  .action(compileCommand)

program
  .command('version')
  .action(printVersion)
  
;(async _ => await program.parseAsync())()
