import fs from 'fs'
import { join } from 'path'
import { createCommand, createArgument } from 'commander'
import { bold, dim } from 'kolorist'
import { log, ok, err } from '../../log.js'
import { env } from '../../env.js'

// Create wallet command
export const deploy = createCommand('code.deploy')
  .alias('cd')
  .description('Deploy a code package')
  .addArgument(createArgument('<source...>', 'One or more source files to deploy'))
  .action(codeDeploy)

// Create wallet action
async function codeDeploy(sources: string[]) {
  log(bold('Building package...'))
  log()

  await env.loadWallet()
  const pkg = buildPkg(sources)

  const res = await env.wallet.fundSignAndBroadcastTx(txb => {
    txb.deploy(pkg)
  })

  console.log(res)
  
}

function buildPkg(sources: string[]): Map<string, string> {
  return sources.reduce((pkg, src) => {
    const srcPath = join(env.codeDir, src)
    try {
      const code = fs.readFileSync(srcPath, 'utf8')
      pkg.set(src, code)
      ok(srcPath)
      return pkg
    } catch(e) {
      log(' ', dim('-'), srcPath)
      throw e
    }
  }, new Map<string, string>())
}
