import {DiscretCounter} from "./discret-counter.js";
import {ExecOpts} from "../exec-opts.js";

export class Measurements {
  movedData: DiscretCounter;
  wasmExecuted: DiscretCounter;
  numContainers: DiscretCounter;
  numSigs: DiscretCounter;
  originChecks: DiscretCounter;
  newJigs: DiscretCounter;
  deploys: DiscretCounter;

  constructor (opts: ExecOpts) {
    this.movedData = new DiscretCounter('Moved Data', opts.moveDataHydroSize, opts.moveDataMaxHydros)
    this.wasmExecuted = new DiscretCounter('Raw Execution', opts.wasmExecutionHydroSize, opts.wasmExecutionMaxHydros)
    this.numContainers = new DiscretCounter('Num Containers', opts.numContHydroSize, opts.numContMaxHydros)
    this.numSigs = new DiscretCounter('Num Sigs', opts.numSigsHydroSize, opts.numSigsMaxHydros)
    this.originChecks = new DiscretCounter('Load By Origin', opts.originCheckHydroSize, opts.originCheckMaxHydros)
    this.newJigs = new DiscretCounter('New Jigs', opts.newJigHydroSize, opts.newJigMaxHydros)
    this.deploys = new DiscretCounter('Deploys', 1n, 30000n)
  }

  clear () {
    return this.movedData.clear() +
      this.wasmExecuted.clear() +
      this.numContainers.clear() +
      this.numSigs.clear() +
      this.originChecks.clear() +
      this.newJigs.clear() +
      this.deploys.clear();
  }
}
