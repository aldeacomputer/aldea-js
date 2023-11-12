import {JigData, NewLowerValue, Storage} from "../src/index.js";
import {WasmContainer} from "../src/wasm-container.js";
import {buildVm} from "./util.js";
import {Address, BCS, BufReader, BufWriter, Lock, LockType, Output, Pointer} from "@aldea/core";
import {expect} from "chai";
import {AbiType} from "../src/abi-helpers/abi-helpers/abi-type.js";
import {WasmWord} from "../src/wasm-word.js";
import {Option} from "../src/support/option.js";
import {PublicLock} from "../src/locks/public-lock.js";
import {serializeOutput} from "../src/abi-helpers/abi-helpers/serialize-output.js";
import {UserLock} from "../src/locks/user-lock.js";
import {emptyTn} from "../src/abi-helpers/well-known-abi-nodes.js";
import {NewLiftValue} from "../src/abi-helpers/new-lift-value.js";


const FLOAT_ERROR: number = 0.00001

describe('NewMemoryLower', () => {
  let modIdFor: (key: string) => Uint8Array
  let storage: Storage;
  let container: WasmContainer;
  let jigData: Map<string, JigData>

  let lower: NewLowerValue
  let target: NewLiftValue
  beforeEach(() => {
    const data = buildVm([
      'test-types',
      'test-types-export'
    ])

    modIdFor = data.modIdFor
    storage = data.storage

    let pkgData = storage.getModule(modIdFor('test-types'))

    container = new WasmContainer(pkgData.mod, pkgData.abi, pkgData.id)
    jigData = new Map<string, JigData>()
    lower = new NewLowerValue(container, (ptr) => Option.fromNullable(jigData.get(ptr.toString())))
    target = new NewLiftValue(container)
  })

  it('can lift an array of u16', () => {
    const buf = new BufWriter()
    buf.writeULEB(3)
    buf.writeU16(1)
    buf.writeU16(2)
    buf.writeU16(3)
    let data = buf.data

    const ty = new AbiType({ name: 'Array', nullable: false, args: [emptyTn('u16')] })

    const ptr = lower.lower(data, ty)

    const lifted = target.lift(ptr, ty)
    expect(lifted).to.eql(data)
  })

  it('can lift an static array of u16', () => {
    const buf = new BufWriter()
    buf.writeULEB(3)
    buf.writeU16(1)
    buf.writeU16(2)
    buf.writeU16(3)
    let data = buf.data

    const ty = new AbiType({ name: 'StaticArray', nullable: false, args: [emptyTn('u16')] })

    const ptr = lower.lower(data, ty)

    const lifted = target.lift(ptr, ty)
    expect(lifted).to.eql(data)
  })

  it('can lift Map<string, string>', () => {
    const buf = new BufWriter()
    buf.writeULEB(5)
    for (const i of [1, 2, 3, 4, 5]) {
      buf.writeBytes(Buffer.from(`aaa ${i}`))
      buf.writeBytes(Buffer.from(`sss ${i}`))
    }

    let data = buf.data

    const ty = new AbiType({ name: 'Map', nullable: false, args: [emptyTn('string'), emptyTn('string')] })

    const ptr = lower.lower(data, ty)

    const lifted = target.lift(ptr, ty)
    expect(lifted).to.eql(data)
  })
});
