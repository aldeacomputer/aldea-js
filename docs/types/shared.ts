import fs from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface TypeLib {
  filename: string;
  contents: string;
}

const matrix = {
  aldea: resolve(__dirname, '../..', 'node_modules', '@aldea/compiler', 'lib/index.d.ts'),
  assemblyscript: resolve(__dirname, '../..', 'node_modules', 'assemblyscript', 'std/assembly/index.d.ts'),
}

export function loadType(name: string): TypeLib {
  const path = matrix[name]
  if (!path) throw new Error('unrecognised lib')
  return {
    filename: `${name}.d.ts`,
    contents: fs.readFileSync(path, 'utf8'),
  }
}
