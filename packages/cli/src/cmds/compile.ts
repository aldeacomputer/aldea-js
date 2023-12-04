import fs from 'fs'
import { join } from 'path'
import { InvalidArgumentError, OptionValues, createCommand, createArgument, createOption } from 'commander'
import { bold, dim, lightGreen } from 'kolorist'
import { compile as aldeac, PackageParser } from '@aldea/compiler'
import { BCS, abiToJson, abiFromBin, base16, blake3 } from '@aldea/sdk'
import { log, ok } from '../log.js'
import { env } from '../globals.js'

// Compile code command
export const compile = createCommand('compile')
  .alias('c')
  .description('Compile a code package')
  .addArgument(createArgument('[entry...]', 'One or more entry files'))
  .addOption(createOption('-e, --entry [entry...]', 'List entry files').default([]))
  .addOption(createOption('-n, --name [name]', 'Package name').argParser(parseName))
  .addOption(createOption('-o, --output [directory]', 'Output directory').default(join(env.codeDir, 'build')))
  .addOption(createOption('--docs', 'Create docs file').default(false))
  .addOption(createOption('--wat', 'Create .wat file').default(false))
  .addOption(createOption('-d, --dry-run', 'Dry run only').default(false))
  .addOption(createOption('-i, --inspect', 'Print out transformed code').default(false).hideHelp())
  .action(compileCode)

interface Opts extends OptionValues {
  entry: string[];
  output: string;
  dryRun: boolean;
  docs: boolean;
  wat: boolean;
}

// Compile code action
async function compileCode(entries: string[], opts: Opts) {
  log(bold('Building package...'))
  log()

  const deps = new Set<string>()
  const pkg = await PackageParser.create(entries, {
    getSrc: (fileName) => {
      const srcPath = join(env.codeDir, fileName)
      deps.add(srcPath)
      return fs.readFileSync(srcPath, 'utf8')
    },
    getDep: (pkgId) => {
      const srcPath = join(env.codeDir, '.packages', pkgId, 'index.ts')
      return fs.readFileSync(srcPath, 'utf8')
    },
  })

  deps.forEach(src => log(' ', dim('-'), src))
  
  const res = await aldeac(pkg.entries, pkg.code, pkg.deps)
  const pkgId = blake3.hash(BCS.pkg.encode([pkg.entries, pkg.code]))

  if (!opts.dryRun) {
    const outdir = opts.output
    const name = opts.name || entries[0].replace(/\.ts$/, '')
    if (!fs.existsSync(outdir)) fs.mkdirSync(outdir)
    fs.writeFileSync(join(outdir, name + '.wasm'), res.output.wasm)
    fs.writeFileSync(join(outdir, name + '.abi.bin'), res.output.abi)
    fs.writeFileSync(join(outdir, name + '.abi.json'), abiToJson(abiFromBin(res.output.abi), 2))
    if (opts.docs && res.output.docs)
      fs.writeFileSync(join(outdir, name + '.docs.json'), res.output.docs);
    if (opts.wat && res.output.wat)
      fs.writeFileSync(join(outdir, name + '.wat'), res.output.wat);
  }
  
  log()
  log(' ', dim('-'), 'Pkg ID:', lightGreen(base16.encode(pkgId)))
  log()
  ok(`Successfull compiled ${pkg.code.size} files`)
  log()
  if (opts.inspect) {
    log(res.stats.toString())
    log(res.stdout.toString())
  }
}

// Parse package name
function parseName(value: string): string {
  if (/^[\w\-_]+$/.test(value)) {
    throw new InvalidArgumentError('invalid package name')
  }
  return value
}
