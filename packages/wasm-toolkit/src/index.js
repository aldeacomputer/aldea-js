import { wasm2json } from './wasm2json.js'
import { json2wasm } from './json2wasm.js'
import { meterJSON } from 'warp-wasm-metering'

const meterWasm = (wasm) => {
    const json = wasm2json(wasm)
    const metered = meterJSON(json, { meterType: 'i64', moduleStr: 'vm', fieldStr: 'meter' })
    return json2wasm(metered)
}

export { meterWasm }
