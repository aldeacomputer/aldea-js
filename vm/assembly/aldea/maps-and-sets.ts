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

