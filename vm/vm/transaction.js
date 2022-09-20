import blake3 from "blake3-wasm"

class Transaction {
  constructor () {
    // this.id = txid
    this.instructions = []
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

  encode () {
    return this.instructions.map(instruction => instruction.encode()).join('\n')
  }

  get id () {
    return blake3.hash(this.encode())
  }
}

export { Transaction }
