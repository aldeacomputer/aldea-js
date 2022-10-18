import {TxExecution} from "../tx-execution.js";

export class LoadInstruction {
  private location: string;
  private forceLocation: boolean;

  constructor (location: string, force = false) {
    this.location = location
    this.forceLocation = force
  }

  exec (context: TxExecution): void {
    context.loadJig(this.location, this.forceLocation)
  }

  encode (): string {
    return `LOAD ${this.location}`
  }
}
