import { FileSystemTree } from '@webcontainer/api'

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
  'aldea': {
    'directory': {
      'main.ts': {
        file: { contents: 'export class Foo extends Jig {}' }
      }
    }
  },
  'aldea.config.cjs': {
    file: { contents: aldeaConfigStr }
  },
  'package.json': {
    file: { contents: packageJsonStr }
  },
}
