export class ExecOpts {
  // Wasm execution
  wasmExecutionHydroSize: bigint
  wasmExecutionMaxHydros: bigint

  // Data moved
  moveDataHydroSize: bigint
  moveDataMaxHydros: bigint


  constructor (
      wasmExecutionHydroSize: bigint,
      wasmExecutionMaxHydros: bigint,
      moveDataMaxHydros: bigint,
      moveDataHydroSize: bigint,
  ) {
    this.wasmExecutionHydroSize = wasmExecutionHydroSize
    this.wasmExecutionMaxHydros = wasmExecutionMaxHydros
    this.moveDataMaxHydros = moveDataMaxHydros
    this.moveDataHydroSize = moveDataHydroSize
  }

  static default () {
    return new this(
      this.defaultWasmExecutionHydroSize,
      this.defaultWasmExecutionMaxHydros,
      this.defaultMoveDataHydroSize,
      this.defaultMoveDataMaxHydros
    )
  }

  static defaultWasmExecutionHydroSize: bigint = 10000n
  static defaultWasmExecutionMaxHydros: bigint = 1000000n

  static defaultMoveDataHydroSize: bigint = 1024n // 1kb default hydro size
  static defaultMoveDataMaxHydros: bigint = 64n * 1024n // 64mb total
}
