import { Transaction } from '../../vm/vm/transaction.js'
import { NewInstruction } from '../../vm/vm/instructions/new-instruction.js'
import { CallInstruction } from '../../vm/vm/instructions/call-instruction.js'
import { LockInstruction } from '../../vm/vm/instructions/lock-instruction.js'
import { UnlockInstruction } from '../../vm/vm/instructions/unlock-instruction.js'
import { LoadInstruction } from '../../vm/vm/instructions/load-instruction.js'
import { LiteralArg } from '../../vm/vm/literal-arg.js'
import { UserLock } from '../../vm/vm/locks/user-lock.js'

export class TransactionJSON {
  static parse (json) {
    const tx = new Transaction()

    json.instructions.forEach(jsonInstruction => {
      switch (jsonInstruction.name) {
        case 'new': {
          const className = jsonInstruction.className
          const argList = jsonInstruction.argList.map(arg => TransactionJSON.parseArg(arg))
          const instruction = new NewInstruction(className, argList)
          tx.add(instruction)
        } break

        case 'call': {
          const masterListIndex = jsonInstruction.masterListIndex
          const methodName = jsonInstruction.methodName
          const args = jsonInstruction.args.map(arg => TransactionJSON.parseArg(arg))
          const instruction = new CallInstruction(masterListIndex, methodName, args)
          tx.add(instruction)
        } break

        case 'lock': {
          const masterListIndex = jsonInstruction.masterListIndex
          const lock = new UserLock(jsonInstruction.lock)
          const instruction = new LockInstruction(masterListIndex, lock)
          tx.add(instruction)
        } break

        case 'unlock': {
          const masterListIndex = jsonInstruction.masterListIndex
          const key = jsonInstruction.key
          const instruction = new UnlockInstruction(masterListIndex, key)
          tx.add(instruction)
        } break

        case 'load': {
          const location = jsonInstruction.location
          const instruction = new LoadInstruction(location)
          tx.add(instruction)
        } break

        default:
          throw new Error(`Unknown instruction: ${jsonInstruction.name}`)
      }
    })

    return tx
  }

  static parseArg (arg) {
    if (typeof arg === 'string') {
      return new LiteralArg(arg)
    }

    if (typeof arg === 'number') {
      return new LiteralArg(arg)
    }

    throw new Error(`Unsupported arg: ${arg}`)
  }
}
