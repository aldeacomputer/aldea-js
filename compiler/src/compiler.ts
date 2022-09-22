import { basename, dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'
import { Arguments, CommandModule } from 'yargs'
import asc from 'assemblyscript/asc'

const baseDir = join(dirname(fileURLToPath(import.meta.url)), '..')

export const compileCmd: CommandModule = {
  command: ['compile <src>', 'c'],
  describe: 'Compile code',
  builder: yargs => {
    return yargs
      .positional('src', {
        type: 'string',
      })
      .option('outFile', {
        alias: 'o',
        type: 'string'
      })
  },
  handler: compile
}

export async function compile(args: Arguments): Promise<void> {
  const srcPath = relative(process.cwd(), args.src as string)
  const outPath = args.outFile ?
    relative(process.cwd(), args.outFile as string) :
    join(dirname(srcPath), basename(srcPath, 'ts')+'wasm')

  const { error, stdout, stderr, stats } = await asc.main([
    srcPath,
    '--outFile', outPath,
    '--debug',
    '--sourceMap',
    '--textFile', outPath.replace('.wasm', '.wat'),
    '--runtime', 'stub',
    '--exportRuntime',
    '--importMemory',
    '--lib', relative(process.cwd(), join(baseDir, 'lib')),
    '--transform', './'+relative(process.cwd(), join(baseDir, './dist/transform.js'))
  ])

  if (error) {
    console.log("Compilation failed: " + error.message)
    console.log(stderr.toString())
  } else {
    console.log("Compilation success: ")
    console.log(stats.toString())
    console.log(stdout.toString())
  }
}
