export class Sword {
    name: string;
    power: i32;

    constructor (name: string) {
        this.name = name
        this.power = 1
    }

    sharp (): void {
        this.power++
    }

    getPower (): i32 {
        return this.power
    }
}
