// import {
//   NewInstruction,
//   CallInstruction,
//   LockInstruction,
//   LoadInstruction,
//   TransactionWrap,
//   LiteralArg
// } from '@aldea/sdk-js'
import { Transaction } from "@aldea/sdk-js"

export class TransactionJSON {
  static parse (json) {
    return Transaction.fromPlainObject(json)
  }

  static toJSON (tx) {
    return tx.toPlainObject()
  }
}
