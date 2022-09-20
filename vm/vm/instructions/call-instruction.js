export class CallInstruction {
  constructor (masterListIndex, methodName, args) {
    this.masterListIndex = masterListIndex
    this.methodName = methodName
    this.args = args
  }

  exec (context) {
    const args = this.args.map(a => a.get(context))
    context.call(this.masterListIndex, this.methodName, args, null)
  }

  encode () {
    const args = this.args.map(arg => arg.encode()).join(' ')
    return `CALL $${this.masterListIndex} ${this.methodName} ${args}`.trim()
  }
}

