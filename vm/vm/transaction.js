import blake3 from "blake3-wasm"

class Transaction {
  constructor () {
    this.instructions = []
    this.signatures = []
  }

  add (instruction) {
    this.instructions.push(instruction)
    return this
  }

  exec (context) {
    for (const instruction of this.instructions) {
      instruction.exec(context)
    }
  }

  serialize () {
    return this.instructions.map(instruction => instruction.encode()).join('\n')
  }

  get hash () {
    return blake3.hash(this.serialize())
  }

  get id () {
    return this.hash.toString('hex')
  }

  isCorrectlySigned () {
    if(this.signatures.length === 0) { return false }
    const data = Buffer.from(this.serialize())
    const pubkeys = this.instructions.map(i => i.getPubKey()).filter(p => p)
    if (pubkeys.length < this.signatures.length) {
      return false
    }
    return pubkeys.every(pubk => {
      const sig = this.signatures.find(s => {
        return Buffer.compare(s.pubkey, pubk) === 0
      })
      return sig && sig.verifyAgainst(data)
    })
  }

  addSignature (signature) {
    this.signatures.push(signature)
  }
}

export { Transaction }
