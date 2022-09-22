export class JigState {
  constructor (origin, location, className, stateBuf, moduleId, lock) {
    this.origin = origin
    this.location = location
    this.className = className
    this.stateBuf = stateBuf
    this.moduleId = moduleId
    this.lock = lock
  }
}
