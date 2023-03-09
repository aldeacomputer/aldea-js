#!/bin/env node
import fs from 'fs'
import { calculatePackageId } from "../tsc/index.js"
import { base16 } from "@aldea/sdk-js"

const filePath = process.argv[2]

if(!filePath) {
  throw new Error('please specify file')
}

const content = fs.readFileSync(filePath)

const map = new Map()
map.set('index.ts', content.toString())

const id = calculatePackageId(['index.ts'], map)

console.log(base16.encode(id))
