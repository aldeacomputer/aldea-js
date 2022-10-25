#!/bin/env node
import fs from 'fs'
import { blake3 } from "@aldea/sdk-js/support/hash"

const filePath = process.argv[2]

if(!filePath) {
  throw new Error('please specify file')
}

const content = fs.readFileSync(filePath)

const hash = blake3(content)

console.log(Buffer.from(hash).toString('hex'))
