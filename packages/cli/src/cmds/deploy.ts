import fs from 'fs'
import { join } from 'path'
import { createCommand, createArgument } from 'commander'
import { bold, dim, lightGreen } from 'kolorist'
import { TxBuilder } from '@aldea/sdk'
import { log, ok } from '../log.js'
import { env } from '../globals.js'

// Deploy code command
export const deploy = createCommand('deploy')
  .alias('d')
  .description('Deploy a code package')
  .addArgument(createArgument('<source...>', 'One or more source files to deploy'))
  .action(deployCode)

// Deploy code action
async function deployCode(sources: string[]) {
  log(bold('Building package...'))
  log()

  await env.loadWallet()
  const pkg = buildPkg(sources)

  const tx = await env.wallet.createFundedTx((txb: TxBuilder) => {
    txb.deploy(pkg)
  })

  const res = await env.wallet.commitTx(tx)

  log()
  log(' ', dim('-'), 'Txn ID:', lightGreen(res.id))
  log(' ', dim('-'), 'Pkg ID:', lightGreen(res.packages[0].id))
  log()
  ok('Package successfully deployed')
  log()
}

// Builds the package map
function buildPkg(sources: string[]): Map<string, string> {
  return sources.reduce((pkg, src) => {
    const srcPath = join(env.codeDir, src)
    log(' ', dim('-'), srcPath)
    const code = fs.readFileSync(srcPath, 'utf8')
    pkg.set(src, code)
    return pkg
  }, new Map<string, string>())
}
