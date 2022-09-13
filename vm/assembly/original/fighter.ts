import { Weapon } from "./weapon";
import { Armor } from "./armor";
import {Skin} from "./skin";
import {Hand} from "./hand";
import {Equipment} from "./equipment";

export class Fighter {
    leftArm: Weapon;
    rightArm: Weapon;
    body: Armor;
    head: Armor;
    stash: Array<Equipment>;
    health: u8;

    constructor () {
        this.leftArm = new Hand();
        this.rightArm = new Hand();
        this.body = new Skin();
        this.head = new Skin();
        this.stash = [];
        this.health = 100;
    }

    equipLeftArm (gear: Weapon) {
        this.leftArm = gear;
    }

    equipRightArm (gear: Weapon) {
        this.rightArm = gear;
    }

    equipHead (gear: Armor) {
        this.head = gear;
    }

    equipArmor (gear: Armor) {
        this.body = gear;
    }

    attack (enemy: Fighter): void {
        enemy.receiveDamage(0);
    }

    receiveDamage (_damage: u8): void {

    }
}