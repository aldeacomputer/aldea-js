import {TxExecution} from "../tx-execution.js";

export class UnlockInstruction {
  private masterListIndex: number;
  private key: Uint8Array;

  constructor (masterListIndex: number, key: Uint8Array) {
    this.masterListIndex = masterListIndex
    this.key = key
  }

  exec (context: TxExecution) {
    const jigRef = context.getJigRef(this.masterListIndex)
    jigRef.open(this.key)
  }

  encode (): string {
    return `UNLOCK $${this.masterListIndex} "${this.key}"`
  }
}
