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
    return this.instructions[0].encode()
  }

  get id () {
    return blake3.hash(this.instructions[0].encode())
  }
}

export { Transaction }
