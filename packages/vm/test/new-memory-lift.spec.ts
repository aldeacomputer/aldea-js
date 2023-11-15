import {JigData, LowerValue, Storage} from "../src/index.js";
import {WasmContainer} from "../src/wasm-container.js";
import {buildVm} from "./util.js";
import {Address, base16, BCS, BufReader, BufWriter, Lock, LockType, Output, Pointer} from "@aldea/core";
import {expect} from "chai";
import {AbiType} from "../src/memory/abi-helpers/abi-type.js";
import {WasmWord} from "../src/wasm-word.js";
import {Option} from "../src/support/option.js";
import {PublicLock} from "../src/locks/public-lock.js";
import {serializeOutput} from "../src/memory/serialize-output.js";
import {AddressLock} from "../src/locks/address-lock.js";
import {emptyTn} from "../src/memory/well-known-abi-nodes.js";
import {ValueLifter} from "../src/memory/value-lifter.js";


const FLOAT_ERROR: number = 0.00001

describe('NewMemoryLower', () => {
  let modIdFor: (key: string) => Uint8Array
  let storage: Storage;
  let container: WasmContainer;
  let jigData: Map<string, JigData>

  let lower: LowerValue
  let target: ValueLifter
  beforeEach(() => {
    const data = buildVm([
      'test-types',
      'test-types-export'
    ])

    modIdFor = data.modIdFor
    storage = data.storage

    let pkgData = storage.getModule(base16.encode(modIdFor('test-types')))

    container = new WasmContainer(pkgData.mod, pkgData.abi, pkgData.id)
    jigData = new Map<string, JigData>()
    lower = new LowerValue(container, (ptr) => Option.fromNullable(jigData.get(ptr.toString())))
    target = new ValueLifter(container)
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


  it('can lift Set<string>', () => {
    const buf = new BufWriter()
    buf.writeULEB(5)
    for (const i of [1, 2, 3, 4, 5]) {
      buf.writeBytes(Buffer.from(`entry ${i}`))
    }

    let data = buf.data

    const ty = new AbiType({ name: 'Set', nullable: false, args: [emptyTn('string')] })

    const ptr = lower.lower(data, ty)

    const lifted = target.lift(ptr, ty)
    expect(lifted).to.eql(data)
  })

  it('can lift a real Jig', () => {
    const stateBuf = new BufWriter()
    const aNumber = 10
    const prop1 = -5;
    const prop2 = 1.5;
    const prop3 = 'prop3';

    stateBuf.writeU32(aNumber)
    stateBuf.writeULEB(1)
    stateBuf.writeI32(prop1)
    stateBuf.writeF64(prop2)
    stateBuf.writeBytes(Buffer.from(prop3))

    const jigOutput = new Output(
      new Pointer(new Uint8Array(32).fill(1), 1),
      new Pointer(new Uint8Array(32).fill(2), 2),
      new Pointer(modIdFor('test-types'), 1),
      new Lock(LockType.ADDRESS, new Uint8Array(20).fill(3)),
      stateBuf.data,
    )

    const outputBuf = serializeOutput(jigOutput)

    const ty = AbiType.fromName('*SmallJig')

    const ptr = lower.lower(outputBuf, ty)
    const lifted = target.lift(ptr, ty)

    expect(base16.encode(lifted) ).to.eql(base16.encode(jigOutput.stateBuf))
  })
});
