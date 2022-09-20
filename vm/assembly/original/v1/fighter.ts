import { Sword } from './sword'

class Fighter {
    name: string;
    health: u32;
    sword: Sword | null;

    constructor(name: string) {
        this.name = name;
        this.health = 100;
        this.sword = null;
    }

    equip (aSword: Sword) {
        this.sword = aSword;
    }

    sharpSword () {
        if (this.sword === null) {
            throw new Error('no sword');
        }
        this.sword.sharp();
        this.health--;
    }

    takeDamage (damage: u32): void {
        this.health = this.health - damage
    }

    getPower (): u32 {
        const sword = this.sword;
        const swordDamage = sword === null ? 0 : sword.getPower();
        return 1 + swordDamage;
    }

    attack (enemy: Fighter): void {
        enemy.takeDamage(
            this.getPower()
        )
    }
}
