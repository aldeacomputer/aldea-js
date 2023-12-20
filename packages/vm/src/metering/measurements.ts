import {HydroCounter} from "./hydro-counter.js";
import {ExecOpts} from "../exec-opts.js";

/**
 * Data structure with all the measurements taken during the execution of a transaction to
 * calculate the execution cost.
 */
export class Measurements {
  movedData: HydroCounter;
  wasmExecuted: HydroCounter;
  numContainers: HydroCounter;
  numSigs: HydroCounter;
  originChecks: HydroCounter;
  newJigs: HydroCounter;
  deploys: HydroCounter;

  constructor (opts: ExecOpts) {
    this.movedData = new HydroCounter('Moved Data', opts.moveDataHydroSize, opts.moveDataMaxHydros)
    this.wasmExecuted = new HydroCounter('Raw Execution', opts.wasmExecutionHydroSize, opts.wasmExecutionMaxHydros)
    this.numContainers = new HydroCounter('Num Containers', opts.numContHydroSize, opts.numContMaxHydros)
    this.numSigs = new HydroCounter('Num Sigs', opts.numSigsHydroSize, opts.numSigsMaxHydros)
    this.originChecks = new HydroCounter('Load By Origin', opts.originCheckHydroSize, opts.originCheckMaxHydros)
    this.newJigs = new HydroCounter('New Jigs', opts.newJigHydroSize, opts.newJigMaxHydros)
    this.deploys = new HydroCounter('Deploys', 1n, 30000n)
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
