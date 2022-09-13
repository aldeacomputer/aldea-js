export class Storage {
    constructor () {
        this.statesPerLocation = new Map()
        this.tips = new Map()
        this.origins = new Map()
    }

    addJig (jigRef) {
        this.statesPerLocation.set(jigRef.location, jigRef)
        this.tips.set(jigRef.origin, jigRef.location)
        this.origins.set(jigRef.location, jigRef.origin)
    }

    getJigState (location) {
        const origin = this.origins.get(location)
        const latestLocation = this.tips.get(origin)
        return this.statesPerLocation.get(latestLocation)
    }

    tipFor (origin) {
        return this.tips.get(origin)
    }
}
