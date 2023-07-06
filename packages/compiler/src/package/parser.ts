import { Parser } from 'assemblyscript'

const LIB_REGX = /^~lib\/((?:@[^/]+\/)?[^/]+)(?:\/(.+))?/
const PKG_REGX = /^pkg:\/\/(([a-f0-9]{2})+)/

export interface PackageLoader {
  getSrc: (fileName: string) => string | void | Promise<string | void>;
  getDep?: (pkgId: string) => string | void | Promise<string | void>;
}

/**
 * PackageParser is a flexible tool for parsing source code and building a
 * package bundle. Using callbacks, local source files and/or external
 * dependencies can be added to the package, in any way suitable for the
 * development context.
 * 
 * ## Example
 * 
 * ```ts
 * const pkg = await PackageParser.create(['entry1.ts', 'entry2.ts], {
 *   // getSrc callback returns source code
 *   getSrc: (fileName) => fs.readFileSync(join(baseDir, fileName)),
 *   // getDep callback returns dependency typings 
 *   getDep: (pkgId) => writeDependency(db.getPackageAbi(pkgId)),
 * })
 * 
 * pkg.entries  // list of entry files
 * pkg.code     // map of package code
 * pkg.deps     // map of package dependencies
 * ```
 */
export class PackageParser {
  code = new Map<string, string>()
  deps = new Map<string, string>()
  private depUrls = new Array<string>()
  private parser = new Parser()

  constructor(
    public entries: string[],
    private loader: PackageLoader,
  ) {}

  static async create(entries: string[], loader: PackageLoader): Promise<PackageParser> {
    const parser = new PackageParser(entries, loader)
    await parser.parse()
    return parser
  }

  get allDeps(): string[] {
    return this.depUrls.map(url => url.replace('pkg://', ''))
  }

  get installedDeps(): string[] {
    return this.depUrls
      .filter(url => [...this.deps.keys()].includes(url))
      .map(url => url.replace('pkg://', ''))
  }

  get requiredDeps(): string[] {
    return this.depUrls
      .filter(url => ![...this.deps.keys()].includes(url))
      .map(url => url.replace('pkg://', ''))
  }

  async parse(): Promise<void> {
    for (const fileName of this.entries) {
      await this.loadSource(fileName)
    }

    this.code.forEach((src, fileName) => {
      this.parser.parseFile(src, fileName, true)
    })

    await this.forParserFiles(async (internalPath: string) => {
      const libM = internalPath.match(LIB_REGX)

      if (libM) {
        const fileName = `${libM[1]}/${libM[2]}`
        const pkgM = fileName.match(PKG_REGX)

        if (pkgM) {
          this.depUrls.push(fileName)
          await this.loadDependency(pkgM[1], false)
        }
      } else {
        const fileName = internalPath + '.ts'
        const src = await this.loadSource(fileName)
        this.parser.parseFile(src!, fileName, false)
      }
    })
  }

  private async forParserFiles(callback: (internalPath: string) => Promise<void>): Promise<void> {
    do {
      const internalPath = this.parser.nextFile()
      if (internalPath == null) break
      await callback(internalPath)
    } while(true)
  }

  private async loadSource(fileName: string, assert: boolean = true): Promise<string | void> {
    const src = await this.loader.getSrc(fileName)
    if (src) {
      this.code.set(fileName, src)
      return src
    } else if (assert) {
      throw new Error(`package source not found: ${fileName}`)
    }
  }

  private async loadDependency(pkgId: string, assert: boolean = true): Promise<string | void> {
    const src = typeof this.loader.getDep === 'function' ?
      await this.loader.getDep(pkgId) :
      null
    if (src) {
      this.deps.set(`pkg://${pkgId}`, src)
      return src
    } else if (assert) {
      throw new Error(`package dependency not found: ${pkgId}`)
    }
  }  
}
