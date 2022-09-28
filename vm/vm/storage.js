export class Storage {
    constructor () {
        this.statesPerLocation = new Map()
        this.tips = new Map()
        this.origins = new Map()
        this.transactions = new Map()
    }

    persist(txExecution) {
      this.addTransaction(txExecution.tx)
      txExecution.outputs.forEach(state => this.addJig(state))
    }

    addJig (jigState) {
        this.statesPerLocation.set(jigState.location, jigState)
        this.tips.set(jigState.origin, jigState.location)
        this.origins.set(jigState.location, jigState.origin)
    }

    getJigState (location) {
        const origin = this.origins.get(location)
        const latestLocation = this.tips.get(origin)
        return this.statesPerLocation.get(latestLocation)
    }

    tipFor (origin) {
        return this.tips.get(origin)
    }

    addTransaction(tx) {
        this.transactions.set(tx.id, tx)
    }

    getTransaction(txid) {
        return this.transactions.get(txid)
    }
}
