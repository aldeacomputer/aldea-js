export class NewInstruction {
    constructor (className, argList) {
        this.className = className
        this.argList = argList
    }

    exec (vm) {
        vm.load(this.className)
        const args = this.argList.map(a => a.get(vm))
        vm.instanciate(this.className, args, null)
    }
}
