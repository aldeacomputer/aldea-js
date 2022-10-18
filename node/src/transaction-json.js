import {
  NewInstruction,
  CallInstruction,
  LockInstruction,
  LoadInstruction,
  Transaction,
  LiteralArg
} from '@aldea/vm'
import { PrivKey } from "@aldea/sdk-js"

export class TransactionJSON {
  static parse (json) {
    const tx = new Transaction()

    json.instructions.forEach(jsonInstruction => {
      switch (jsonInstruction.name) {
        case 'new': {
          const moduleName = jsonInstruction.moduleName
          const className = jsonInstruction.className
          const args = jsonInstruction.args.map(arg => TransactionJSON.parseArg(arg))
          const instruction = new NewInstruction(moduleName, className, args)
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
          const instruction = new LockInstruction(masterListIndex, PrivKey.fromRandom().toPubKey())
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

  static toJSON (tx) {
    const instructions = []
    const json = { instructions }

    tx.instructions.forEach(instruction => {
      const jsonInstruction = Object.assign({}, instruction)

      if (instruction instanceof LoadInstruction) {
        jsonInstruction.name = 'load'
      } else if (instruction instanceof LockInstruction) {
        jsonInstruction.name = 'lock'
      } else if (instruction instanceof CallInstruction) {
        jsonInstruction.name = 'call'
        jsonInstruction.args = jsonInstruction.args.map(arg => TransactionJSON.argToJSON(arg))
      } else if (instruction instanceof NewInstruction) {
        jsonInstruction.name = 'new'
        jsonInstruction.args = jsonInstruction.args.map(arg => TransactionJSON.argToJSON(arg))
      }

      instructions.push(jsonInstruction)
    })

    return json
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

  static argToJSON (arg) {
    if (arg instanceof LiteralArg) {
      return arg.literal
    }

    throw new Error(`Unsupported arg: ${arg}`)
  }
}
