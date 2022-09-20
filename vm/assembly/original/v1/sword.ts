export class Sword {
    name: string;
    power: u32;

    constructor (name: string) {
        this.name = name
        this.power = 1
    }

    sharp (): void {
        this.power++
    }

    getPower (): u32 {
        return this.power
    }
}
