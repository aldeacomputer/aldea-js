export class NewInstruction {
    constructor (className, argList) {
        this.className = className
        this.argList = argList
    }

    exec (vm, _context) {
        vm.load(this.className)
        const args = this.argList.map(a => a.get(vm))
        vm.instanciate(this.className, args)
    }
}