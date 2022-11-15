/**
 * Builds the index.d.ts for the Aldea standard lib
 */
import fs from 'fs'
import dts from 'dts-generator'
import concat from 'concat'

async function build() {
  await dts.default({
    project: 'lib',
    exclude: [
      '*.d.ts',
      '__tests__/**',
      'aldea.ts',
      'aldea/arg-writer.ts',
      'aldea/imports.ts',
    ],
    out: 'lib/index.d.ts'
  })

  const index = './lib/index.d.ts'
  const globals = './lib/global.d.ts'

  await concat([index, globals], index)
  const data = fs.readFileSync(index, 'utf8')
  fs.writeFileSync(index, data.replace(/\n\/\/ @ts-nocheck/, ''), 'utf8')
}

build()