import {NewLowerValue, Storage} from "../src/index.js";
import {WasmContainer} from "../src/wasm-container.js";
import {buildVm} from "./util.js";
import {BufReader, BufWriter} from "@aldea/core";
import {expect} from "chai";
import {AbiType} from "../src/abi-helpers/abi-helpers/abi-type.js";

const FLOAT_ERROR: number = 0.00001

describe('NewMemoryLower', () => {
  let modIdFor: (key: string) => Uint8Array
  let storage: Storage;
  let container: WasmContainer;

  let target: NewLowerValue
  beforeEach(() => {
    const data = buildVm([
      'test-types'
    ])

    modIdFor = data.modIdFor
    storage = data.storage

    let pkgData = storage.getModule(modIdFor('test-types'))

    container = new WasmContainer(pkgData.mod, pkgData.abi, pkgData.id)
    target = new NewLowerValue(container)
  })

  it('can lower an u8', () => {
    const inputBuf = new BufWriter()
    inputBuf.writeU8(10)
    const ty = AbiType.fromName('u8')
    let ptr = target.lower(inputBuf.data, ty)

    expect(ptr.toNumber()).to.eql(10)
  })

  it('can lower u16', () => {
    const buf = new BufWriter()
    buf.writeU16(10)
    const ty = AbiType.fromName('u16')

    let ptr = target.lower(buf.data, ty)
    expect(ptr.toNumber()).to.eql(10)
  })

  it('can lower u32', () => {
    const buf = new BufWriter()
    buf.writeU32(10)
    const ty = AbiType.fromName('u32')

    let ptr = target.lower(buf.data, ty)
    expect(ptr.toNumber()).to.eql(10)
  })

  it('can lower u64', () => {
    const buf = new BufWriter()
    buf.writeU64(10)
    const ty = AbiType.fromName('u64')

    let ptr = target.lower(buf.data, ty)
    expect(ptr.toBigInt()).to.eql(10n)
  })

  it('can lower an i8', () => {
    const buf = new BufWriter()
    buf.writeU8(-1)
    const ty = AbiType.fromName('i8')
    let ptr = target.lower(buf.data, ty)

    expect(ptr.toNumber()).to.eql(-1)
  })

  it('can lower an i16', () => {
    const buf = new BufWriter()
    buf.writeU16(-1)
    const ty = AbiType.fromName('i16')
    let ptr = target.lower(buf.data, ty)

    expect(ptr.toNumber()).to.eql(-1)
  })

  it('can lower an i32', () => {
    const buf = new BufWriter()
    buf.writeU32(-1)
    const ty = AbiType.fromName('i32')
    let ptr = target.lower(buf.data, ty)

    expect(ptr.toNumber()).to.eql(-1)
  })

  it('can lower an i64', () => {
    const buf = new BufWriter()
    buf.writeU64(-1)
    const ty = AbiType.fromName('i64')
    let ptr = target.lower(buf.data, ty)

    expect(ptr.toBigInt()).to.eql(-1n)
  })

  it('can lower an f32', () => {
    const buf = new BufWriter()
    buf.writeF32(-1.2)
    const ty = AbiType.fromName('f32')
    let ptr = target.lower(buf.data, ty)

    expect(ptr.toNumber()).to.be.approximately(-1.2, FLOAT_ERROR)
  })

  it('can lower an f64', () => {
    const buf = new BufWriter()
    buf.writeF64(-1.2)
    const ty = AbiType.fromName('f64')
    let ptr = target.lower(buf.data, ty)

    expect(ptr.toNumber()).to.eql(-1.2)
  })

  it('can lower bool', () => {
    const buf1 = new BufWriter()
    const buf2 = new BufWriter()
    buf1.writeBool(true)
    buf2.writeBool(false)
    const ty = AbiType.fromName('bool')
    let ptr1 = target.lower(buf1.data, ty)
    let ptr2 = target.lower(buf2.data, ty)

    expect(ptr1.toBool()).to.eql(true)
    expect(ptr2.toBool()).to.eql(false)
  })

  it('can lower array of u8', () => {
    const buf = new BufWriter()
    buf.writeULEB(5)
    buf.writeU8(1)
    buf.writeU8(2)
    buf.writeU8(3)
    buf.writeU8(4)
    buf.writeU8(5)

    const ty = new AbiType({ name: 'Array', args: [AbiType.fromName('u8')], nullable: false })
    let ptr = target.lower(buf.data, ty)
    let objHeader = container.mem.read(ptr.minus(8n), 8);

    let rtid = container.abi.rtIdByName('Array<u8>')
    const objHeaderReader = new BufReader(objHeader)
    expect(objHeaderReader.readU32()).to.eql(rtid.get().id)
  })
});
