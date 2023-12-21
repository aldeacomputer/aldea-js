import { FileSystemTree, DirectoryNode } from '@webcontainer/api'

export interface FrontmatterFileTree {
  [name: string]: FrontmatterFileTree | string
}

export interface FileListNode {
  name: string;
  path: string;
  children?: FileListNode[];
}

const aldeaConfigStr = `
/** @type {import('@aldea/cli').Config} */
module.exports = {
  codeDir: 'aldea',
  nodeUrl: 'https://node.aldea.computer'
}
`.trim()

const packageJsonStr = `
{
  "name": "aldea-demo",
  "type": "module",
  "dependencies": {
    "@aldea/cli": "*",
    "@aldea/sdk": "*"
  }
}
`.trim()

export const baseFiles: FileSystemTree = {
  'aldea.config.cjs': {
    file: { contents: aldeaConfigStr }
  },
  'package.json': {
    file: { contents: packageJsonStr }
  },
}

export function fmToFileSystemTree(files: Record<string, string>): FileSystemTree {
  const reducer = (obj, [path, src]) => {
    const [name, ...rest] = path.split('/')
    if (rest.length) {
      obj[name] ||= { directory: {} }

      const enties: [string, string][] = new Array([rest.join('/'), src])
      enties.reduce(reducer, obj[name].directory)
    } else {
      obj[name] = { file: { contents: src } }
    }
    return obj
  }

  return Object.entries(files).reduce<FileSystemTree>(reducer, {})
}

export function fsToFileList(files: FileSystemTree, base: string = ''): FileListNode[] {
  return Object.entries(files).reduce<FileListNode[]>((list, [name, node]) => {
    const path = [base, name].join('/').replace(/^\//, '')
    const listNode: FileListNode = { name, path }
    if ('directory' in node) {
      listNode.children = fsToFileList(node.directory, path)
    }
    list.push(listNode)
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [])
}
