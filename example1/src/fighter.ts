export class Fighter {
  name: string;
  exp: u32;

  constructor(name: string) {
    this.name = name
    this.exp = 0
  }

  equip(weapon: Weapon): void {
    this.exp += weapon.power
  }

  battle(opponent: Fighter): string {
    if (this.exp > opponent.exp) {
      this.win()
      opponent.lose()
      return `${this.name} defeats ${opponent.name}`
    } else {
      this.lose()
      opponent.win()
      return `${opponent.name} defeats ${this.name}`
    }
  }

  win(): void {
    this.exp += 5
  }

  lose(): void {
    if (this.exp < 3) { this.exp = 0 }
    else              { this.exp -= 3 }
  }
}

@jig('./build/weapon.wasm')
declare class Weapon {
  power: u32;
}
