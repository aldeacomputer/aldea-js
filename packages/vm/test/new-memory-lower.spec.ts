import {NewLowerValue, Storage} from "../src/index.js";
import {WasmContainer} from "../src/wasm-container.js";
import {buildVm} from "./util.js";
import {BufWriter} from "@aldea/core";
import {emptyTn} from "../src/abi-helpers/well-known-abi-nodes.js";
import {expect} from "chai";

describe('NewMemoryLower', () => {
  let modIdFor: (key: string) => Uint8Array
  let storage: Storage;

  let target: NewLowerValue
  beforeEach(() => {
    const data = buildVm([
      'flock'
    ])

    modIdFor = data.modIdFor
    storage = data.storage

    let pkgData = storage.getModule(modIdFor('flock'))

    let container = new WasmContainer(pkgData.mod, pkgData.abi, pkgData.id)
    target = new NewLowerValue(container)
  })

  it('can lower an u8', () => {
    const inputBuf = new BufWriter()
    inputBuf.writeU8(10)
    const ty = emptyTn('u8')
    let ptr = target.lower(inputBuf.data, ty)

    expect(ptr.toNumber()).to.eql(10)
  })

  it('can lower u16', () => {
    const buf = new BufWriter()
    buf.writeU16(10)
    const ty = emptyTn('u16')

    let ptr = target.lower(buf.data, ty)
    expect(ptr.toNumber()).to.eql(10)
  })

  it('can lower u32', () => {
    const buf = new BufWriter()
    buf.writeU32(10)
    const ty = emptyTn('u32')

    let ptr = target.lower(buf.data, ty)
    expect(ptr.toNumber()).to.eql(10)
  })

  it('can lower u64', () => {
    const buf = new BufWriter()
    buf.writeU64(10)
    const ty = emptyTn('u64')

    let ptr = target.lower(buf.data, ty)
    expect(ptr.toBigInt()).to.eql(10n)
  })

  it('can lower an i8', () => {
    const buf = new BufWriter()
    buf.writeU8(-1)
    const ty = emptyTn('i8')
    let ptr = target.lower(buf.data, ty)

    expect(ptr.toNumber()).to.eql(-1)
  })

  it('can lower an i16', () => {
    const buf = new BufWriter()
    buf.writeU16(-1)
    const ty = emptyTn('i16')
    let ptr = target.lower(buf.data, ty)

    expect(ptr.toNumber()).to.eql(-1)
  })

  it('can lower an i32', () => {
    const buf = new BufWriter()
    buf.writeU32(-1)
    const ty = emptyTn('i32')
    let ptr = target.lower(buf.data, ty)

    expect(ptr.toNumber()).to.eql(-1)
  })

  it('can lower an i64', () => {
    const buf = new BufWriter()
    buf.writeU64(-1)
    const ty = emptyTn('i64')
    let ptr = target.lower(buf.data, ty)

    expect(ptr.toBigInt()).to.eql(-1n)
  })
});
