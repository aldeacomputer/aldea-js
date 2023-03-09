export class JigMap extends Jig {
  myMap: Map<string, string>

  constructor() {
    super();
    this.myMap = new Map<string, string>()
  }

  add(key: string, value: string): Map<string, string> {
    this.myMap.set(key, value)
    return this.myMap
  }
}

export class JigKey extends Jig {}

export class JigValue extends Jig {}

export class JigToJigMap extends Jig {
  myMap: Map<JigKey, JigValue>
  constructor() {
    super();
    this.myMap = new Map<JigKey, JigValue>()
  }

  add(key: JigKey, value: JigValue): void {
    key.$lock.changeToJigLock()
    value.$lock.changeToJigLock()
    this.myMap.set(key, value)
  }
}
