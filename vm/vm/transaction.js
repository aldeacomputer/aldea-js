class Transaction {
    constructor (txid) {
        this.id = txid
        this.instructions = []
    }

    add(instruction) {
        this.instructions.push(instruction)
    }

    async exec (vm) {
        for(const instruction of this.instructions) {
            await instruction.exec(vm)
        }
    }
}

export { Transaction }