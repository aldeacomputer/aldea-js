import {NewLowerValue, Storage} from "../src/index.js";
import {WasmContainer} from "../src/wasm-container.js";
import {buildVm} from "./util.js";
import {BufWriter} from "@aldea/core";
import {emptyTn} from "../src/abi-helpers/well-known-abi-nodes.js";
import {expect} from "chai";

describe('NewMemoryLower', () => {
  let modIdFor: (key: string) => Uint8Array
  let storage: Storage;


  beforeEach(() => {
    const data = buildVm([
      'flock'
    ])

    modIdFor = data.modIdFor
    storage = data.storage
  })

  it('can lower an u8', () => {
    let pkgData = storage.getModule(modIdFor('flock'))

    let container = new WasmContainer(pkgData.mod, pkgData.abi, pkgData.id)
    const lower = new NewLowerValue(container)
    const buf = new BufWriter()
    buf.writeU8(10)
    const ty = emptyTn('u8')
    let ptr = lower.lower(buf.data, ty)

    expect(ptr.toNumber()).to.eql(10)
  })

  it('can lower unsigned ints', () => {

  })
});
