class Transaction {
  constructor (txid) {
    this.id = txid
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
}

export { Transaction }
