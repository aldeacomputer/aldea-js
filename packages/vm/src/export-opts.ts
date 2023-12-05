export class ExecOpts {
  // Wasm execution
  wasmExecutionHydroSize: bigint
  wasmExecutionMaxHydros: bigint

  // Data moved
  moveDataHydroSize: bigint
  moveDataMaxHydros: bigint

  // Number of containers
  numContHydroSize: bigint;
  numContMaxHydros: bigint;

  // Number of signatures
  numSigsHydroSize: bigint;
  numSigsMaxHydros: bigint;

  // Number of load by origin
  originCheckHydroSize: bigint;
  originCheckMaxHydros: bigint;

  // Deploy cost
  deployHydroCost: bigint;

  constructor (
      wasmExecutionHydroSize: bigint,
      wasmExecutionMaxHydros: bigint,
      moveDataMaxHydros: bigint,
      moveDataHydroSize: bigint,
      numContHydroSize: bigint,
      numContMaxHydros: bigint,
      numSigsHydroCount: bigint,
      numSigsMaxHydros: bigint,
      originCheckHydroSize: bigint,
      originCheckMaxHydros: bigint,
      deployHydroCost: bigint
  ) {
    this.wasmExecutionHydroSize = wasmExecutionHydroSize
    this.wasmExecutionMaxHydros = wasmExecutionMaxHydros
    this.moveDataMaxHydros = moveDataMaxHydros
    this.moveDataHydroSize = moveDataHydroSize
    this.numContHydroSize = numContHydroSize
    this.numContMaxHydros = numContMaxHydros
    this.numSigsHydroSize = numSigsHydroCount
    this.numSigsMaxHydros = numSigsMaxHydros
    this.originCheckHydroSize = originCheckHydroSize
    this.originCheckMaxHydros = originCheckMaxHydros
    this.deployHydroCost = deployHydroCost
  }

  static default () {
    return new this(
        this.defaultWasmExecutionHydroSize,
        this.defaultWasmExecutionMaxHydros,
        this.defaultMoveDataHydroSize,
        this.defaultMoveDataMaxHydros,
        this.defaultNumContHydroSize,
        this.defaultNumContMaxHydros,
        this.defaultNumSigsHydroSize,
        this.defaultNumSigsMaxHydros,
        this.defaultOriginCheckHydroSize,
        this.defaultOriginCheckMaxHydros,
        this.defaultDeployHydroCost
    )
  }

  static defaultWasmExecutionHydroSize: bigint = 10000n
  static defaultWasmExecutionMaxHydros: bigint = 1000000n

  static defaultMoveDataHydroSize: bigint = 1024n // 1kb default hydro size
  static defaultMoveDataMaxHydros: bigint = 64n * 1024n // 64mb total

  static defaultNumContHydroSize: bigint = 1n;
  static defaultNumContMaxHydros: bigint = 50n;

  static defaultNumSigsHydroSize: bigint = 1n;
  static defaultNumSigsMaxHydros: bigint = 100n;

  static defaultOriginCheckHydroSize: bigint = 1n;
  static defaultOriginCheckMaxHydros: bigint = 1000000n;

  static defaultDeployHydroCost: bigint = 1000n;
}
