export class UnlockInstruction {
    constructor (key) {
        this.key = key
    }

    exec (vm) {
        vm.addKey(this.key)
    }
}
