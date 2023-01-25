export class Sheep extends Jig {
  name: string
  color: string
  legCount: u8

  constructor(name: string, color: string = 'white') {
    super()
    this.name = name
    this.color = color
    if (this.color !== 'white' && this.color !== 'black') {
      throw new Error(`unknown color: ${this.color}. Valid options are black and white.`)
    }
    this.legCount = 4
  }

  chopOneLeg(): void {
    if (this.legCount === 0) {
      throw new Error('no more legs to cut')
    }
    this.legCount = this.legCount - 1
  }
}

// class MutantSheep extends Sheep {
//   constructor(name: string, color: string = 'white') {
//     super(name, color)
//     this.legCount = 7
//   }
//
//   regenerateLeg (): void {
//     this.legCount += 1
//   }
// }

export class Flock extends Jig {
  sheeps: Sheep[]
  byColor: Map<string, Set<Sheep>>

  constructor () {
    super()
    this.sheeps = []
    this.byColor = new Map<string, Set<Sheep>>()
  }

  add (aSheep: Sheep): void {
    aSheep.$lock.changeToCallerLock()
    this.sheeps.push(aSheep)
    if (this.byColor.has(aSheep.color)) {
      const existing = this.byColor.get(aSheep.color)
      existing.add(aSheep)
    } else {
      const newSet = new Set<Sheep>()
      newSet.add(aSheep)
      this.byColor.set(aSheep.color, newSet)
    }
  }

  legCount (): u32 {
    return this.sheeps.reduce((total: u32, aSheep: Sheep) => aSheep.legCount + total, 0)
  }

  chopManyLegs (cmd: Map<Sheep, u8>): void {
    for (let i = 0; i < this.sheeps.length; i++) {
      const sheep = this.sheeps[i]
      let amount = cmd.get(sheep) || 0
      while (amount > 0) {
        sheep.chopOneLeg()
        amount--
      }
    }
  }

  orderedByLegs (): Map<u8, Set<Sheep>> {
    const ret = new Map<u8, Set<Sheep>>()
    for (let i = 0; i < this.sheeps.length; i++) {
      const sheep = this.sheeps[i]
      let set: Set<Sheep>
      if (!ret.has(sheep.legCount)) {
        set = new Set<Sheep>()
      } else {
        set = ret.get(sheep.legCount)
      }
      set.add(sheep)
      ret.set(sheep.legCount, set)
    }
    return ret
  }

  addSheepsNested (nestedNestedSheeps: Sheep[][]): void {
    for (let outerIndex = 0; outerIndex < nestedNestedSheeps.length; outerIndex++) {
      const nestedSheeps = nestedNestedSheeps[outerIndex]
      for (let innerIndex = 0; innerIndex < nestedSheeps.length; innerIndex++) {
        const sheep = nestedSheeps[innerIndex]
        this.add(sheep)
      }
    }
  }
}

export function buildFlockWithNSheeps (n: u32): Flock {
  const flock = new Flock()
  for (let i: u32 = 0; i < n; i++) {
    const aSheep = new Sheep(`sheep n: ${n}`, n % 2 === 0 ? 'black' : 'white')
    flock.add(aSheep)
  }
  return flock
}
