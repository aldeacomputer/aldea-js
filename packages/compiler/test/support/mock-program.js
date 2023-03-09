import fs from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { Compiler, Program, Options, SourceKind, NodeKind } from 'assemblyscript'
import { libraryFiles, libraryPrefix } from 'assemblyscript/asc'

const baseDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const libDir = resolve(baseDir, 'lib')
const ext = '.ts'

/**
 * Replicates how assemblyscript creates a program. We can use this to test
 * individual parts of the transformer. eg:
 * 
 *     const mock = createMock(src)
 *     const ctx = new TransformCtx(mock.pgm)
 *     // test parts of the ctx
 */
class MockProgram {
  constructor(srcCode) {
    const opts = createCompilerOpts()
    this.pgm = new Program(opts)
    this.parser = this.pgm.parser

    // Parse AS library files
    Object.keys(libraryFiles).forEach(libPath => {
      if (libPath.includes('/')) return;
      const path = libraryPrefix + libPath + ext
      this.parser.parseFile(libraryFiles[libPath], path, false)
    })

    // Parse Aldea library files
    fs.readdirSync(libDir)
      .filter(fn => /^((?!\.d).)*\.ts$/.test(fn))
      .forEach(filename => {
        const libFile = fs.readFileSync(join(libDir, filename), 'utf8')
        const path = libraryPrefix + filename
        // libraryFiles[libPath.replace(extension_re, "")] = libText; ???
        this.parser.parseFile(libFile, path, false)
      })

    // Parse runtime first then user src
    this.parser.parseFile(libraryFiles['rt/index-stub'], libraryPrefix + 'rt/index-stub.ts', true)
    this.parser.parseFile(srcCode, './index.ts', true)
  }

  get source() {
    return this.parser.sources.find(s => {
      return s.sourceKind === SourceKind.UserEntry && /^(?!~lib).+/.test(s.internalPath)
    })
  }

  get classes() {
    return this.source.statements.filter(n => n.kind === NodeKind.ClassDeclaration)
  }

  get functions() {
    return this.source.statements.filter(n => n.kind === NodeKind.FunctionDeclaration)
  }

  get interfaces() {
    return this.source.statements.filter(n => n.kind === NodeKind.InterfaceDeclaration)
  }

  async compile() {
    await this.parseBacklog()
    this.pgm.initialize()
    this.parser.finish()
    return new Compiler(this.pgm).compile()
  }

  backlog() {
    const paths = []
    let internalPath
    while (true) {
      internalPath = this.parser.nextFile()
      if (internalPath == null) break
      paths.push(internalPath)
    }
    return(paths)
  }

  async parseBacklog() {
    let backlog;
    while ((backlog = this.backlog()).length) {
      let files = []
      for (let internalPath of backlog) {
        const dependee = this.parser.getDependee(internalPath);
        files.push(getFile(internalPath, dependee)); // queue
      }
      files = await Promise.all(files)
      for (let i = 0, k = backlog.length; i < k; i++) {
        const file = files[i]
        if (file) {
          this.parser.parseFile(file.sourceText, file.sourcePath, false)
        } else {
          this.parser.parseFile(null, backlog[i] + ext, false)
        }
      }
    }
  }
}

export async function mockProgram(src) {
  const mock = new MockProgram(src)
  await mock.parseBacklog()
  return mock
}

function createCompilerOpts() {
  const opts = new Options()
  opts.runtime = 0
  return opts
}

async function getFile(internalPath, dependeePath) {
  let sourcePath = null
  let sourceText = null

  const plainName = internalPath.substring(libraryPrefix.length)
  const indexName = `${plainName}/index`

  if (Object.hasOwn(libraryFiles, plainName)) {
    sourcePath = libraryPrefix + plainName + ext
    sourceText = libraryFiles[plainName]
  } else if (Object.hasOwn(libraryFiles, indexName)) {
    sourcePath = libraryPrefix + indexName + ext
    sourceText = libraryFiles[indexName]
  } else {
    const plainPath = join(libDir, plainName + ext)
    const indexPath = join(libDir, indexName + ext)
    if (fs.existsSync(plainPath)) {
      sourcePath = libraryPrefix + plainName + ext
      sourceText = fs.readFileSync(plainPath, 'utf8')
    } else if (fs.existsSync(indexPath)) {
      sourcePath = libraryPrefix + indexName + ext
      sourceText = fs.readFileSync(indexPath, 'utf8')
    }
  }

  if (sourceText == null) return null
  return { sourceText, sourcePath }
}