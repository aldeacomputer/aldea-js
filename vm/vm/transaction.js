class Transaction {
    constructor (txid) {
        this.id = txid
        this.instructions = []
    }

    add(instruction) {
        this.instructions.push(instruction)
    }

    exec (vm) {
        for(const instruction of this.instructions) {
            instruction.exec(vm)
        }
    }
}

export { Transaction }
