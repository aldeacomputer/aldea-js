export class JigState {
  constructor (origin, location, stateBuf, moduleId, lock) {
    this.origin = origin
    this.location = location
    this.stateBuf = stateBuf
    this.moduleId = moduleId
    this.lock = lock
  }
}
