export class LoadInstruction {
    constructor (location) {
        this.location = location
    }

    exec (vm) {
        vm.loadJig(this.location)
    }
}