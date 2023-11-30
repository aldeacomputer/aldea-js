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

export class MutantSheep extends Sheep {
  radiation: u32
  constructor(name: string, color: string = 'white') {
    super(name, color)
    this.legCount = 7
    this.radiation = 0
  }

  regenerateLeg (): void {
    this.legCount += 1
    this.radiation += 10
  }
}

export function clone (original: Sheep): Sheep {
  return new Sheep(original.name, original.color)
}
