import fs from 'fs'
import { basename, join, relative, resolve } from 'path'
import { fileURLToPath } from 'url'
import minimist from 'minimist'
import prompts from 'prompts'
import { red } from 'kolorist'

const defaultDir = 'aldea-project'
const defaultTmp = 'default'

async function create(cwd: string, argv: minimist.ParsedArgs): Promise<void> {
  let setup: prompts.Answers<'projectName' | 'overwrite' | 'packageName'>
  let tgtDir: string

  const getProjectName = () => tgtDir === '.' ? basename(resolve()) : tgtDir
  const argDir = formatTargetDir(argv._[0])
  tgtDir = argDir || defaultDir

  try {
    setup = await prompts([
      {
        type: argDir ? null : 'text',
        name: 'projectName',
        message: 'Project name:',
        initial: defaultDir,
        onState({ value }) {
          tgtDir = formatTargetDir(value) || defaultDir
        }
      },
      {
        type() {
          return fs.existsSync(tgtDir) && !isEmpty(tgtDir) ? 'confirm' : null
        },
        name: 'overwrite',
        message: (tgtDir === '.' ?
          'Current directory' :
          `Target directory "${tgtDir}"`) +
          ' is not empty. Remove existing files and continue?'
      },
      {
        type(_, { overwrite }) {
          if (overwrite === false) throw new Error(red('✖') + ' Operation cancelled')
          return null
        },
        name: 'overwriteCheck'
      },
      {
        type() {
          return isValidPackageName(getProjectName()) ? null : 'text'
        },
        name: 'packageName',
        message: 'Package name:',
        initial() { return toValidPackageName(getProjectName()) },
        validate(name) {
          return isValidPackageName(name) || `${red('✖')} Invalid package.json name`
        }
      }, 
    ])
  } catch(cancelled: any) {
    console.log(cancelled.message)
    return
  }

  const { overwrite, packageName } = setup
  const root = join(cwd, tgtDir || defaultDir)

  const templateDir = resolve(
    fileURLToPath(import.meta.url), '../..', 'templates', defaultTmp
  )

  const pkg = JSON.parse(
    fs.readFileSync(join(templateDir, `package.json`), 'utf-8')
  )

  pkg.name = packageName || getProjectName()

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo?.name || 'npm'
  //const isYarn1 = pkgManager === 'yarn' && pkgInfo?.version.startsWith('1.')

  console.log(`\nScaffolding project in ${root}...`)

  createDir(root, overwrite)
  copyDir(templateDir, root, ['package.json'])
  writeFile(join(root, 'package.json'), JSON.stringify(pkg, null, 2))

  console.log(`\nDone. Now run:\n`)

  if (root !== cwd) {
    console.log(`  cd ${relative(cwd, root)}`)
  }
  switch (pkgManager) {
    case 'yarn':
      console.log('  yarn')
      console.log('  yarn dev')
      break
    default:
      console.log(`  ${pkgManager} install`)
      console.log(`  ${pkgManager} run dev`)
      break
  }
  console.log()
}

const renameFiles: Record<string, string | undefined> = {
  _gitignore: '.gitignore'
}

function copyDir(srcDir: string, tgtDir: string, exclude: string[] = []): void {
  createDir(tgtDir)
  
  const files = fs.readdirSync(srcDir)
  for (const file of files.filter((f) => !exclude.includes(f))) {
    const name = renameFiles[file] ?? file
    copyFile(join(srcDir, file), join(tgtDir, name))
  }
}

function copyFile(src: string, dest: string): void {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDir(src, dest)
  } else {
    fs.copyFileSync(src, dest)
  }
}

function createDir(dir: string, overwrite: boolean = false): void {
  if (overwrite) {
    emptyDir(dir)
  } else if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function emptyDir(dir: string): void {
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      if (file === '.git') continue
      fs.rmSync(resolve(dir, file), { recursive: true, force: true })
    }
  }
}

function formatTargetDir(dir: string | undefined): string | undefined {
  return dir?.trim().replace(/\/+$/g, '')
}

function isEmpty(dir: string): boolean {
  const files = fs.readdirSync(dir)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

function isValidPackageName(name: string): boolean {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(name)
}

function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) return undefined
  const pkgSpec = userAgent.split(' ')[0].split('/')
  return {
    name: pkgSpec[0],
    version: pkgSpec[1]
  }
}

function toValidPackageName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-')
}

function writeFile(path: string, data: string) {
  fs.writeFileSync(path, data)
}

const argv = minimist(process.argv.slice(2), {
  string: ['_']
})

create(process.cwd(), argv).catch((e) => {
  console.error(e)
})
