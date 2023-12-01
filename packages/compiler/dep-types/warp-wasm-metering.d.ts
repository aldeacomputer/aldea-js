declare module 'wasm-metering' {
  export function meterWASM(wasm: Uint8Array, opts: any): Uint8Array;
  export function meterJSON(json: any, opts: any): Uint8Array;
}

declare module '@aldea/wasm-toolkit' {
  export function wasm2json(wasm: Uint8Array, opts: any): any;
  export function json2wasm(json: any, opts: any): Uint8Array;
}
