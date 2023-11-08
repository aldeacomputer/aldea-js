import {NewLowerValue, Storage} from "../src/index.js";
import {WasmContainer} from "../src/wasm-container.js";
import {buildVm} from "./util.js";
import {BufReader, BufWriter} from "@aldea/core";
import {expect} from "chai";
import {AbiType} from "../src/abi-helpers/abi-helpers/abi-type.js";
import {WasmWord} from "../src/wasm-word.js";

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
    let objHeader = container.mem.read(ptr.minus(8), 8);

    let rtid = container.abi.rtIdByName('Array<u8>')
    const objHeaderReader = new BufReader(objHeader)
    expect(objHeaderReader.readU32()).to.eql(rtid.get().id)
    expect(objHeaderReader.readU32()).to.eql(16)

    const arrMem = container.mem.read(ptr, 16);
    const arrMemReader = new BufReader(arrMem)
    const arrBufPtr = WasmWord.fromNumber(arrMemReader.readU32())
    expect(arrMemReader.readU32()).to.eql(arrBufPtr.toNumber())
    expect(arrMemReader.readU32()).to.eql(5)
    expect(arrMemReader.readU32()).to.eql(5)

    const arrBufMem = container.mem.read(arrBufPtr, 5);
    const arrBufReader = new BufReader(arrBufMem)
    expect(arrBufReader.readU8()).to.eql(1)
    expect(arrBufReader.readU8()).to.eql(2)
    expect(arrBufReader.readU8()).to.eql(3)
    expect(arrBufReader.readU8()).to.eql(4)
    expect(arrBufReader.readU8()).to.eql(5)
  })

  it('can lower array of u16', () => {
    const buf = new BufWriter()
    buf.writeULEB(5)
    buf.writeU16(1)
    buf.writeU16(2)
    buf.writeU16(3)
    buf.writeU16(4)
    buf.writeU16(5)

    const ty = new AbiType({ name: 'Array', args: [AbiType.fromName('u16')], nullable: false })
    let ptr = target.lower(buf.data, ty)

    const arrMem = container.mem.read(ptr, 16);
    const arrMemReader = new BufReader(arrMem)
    const arrBufPtr = WasmWord.fromNumber(arrMemReader.readU32())
    expect(arrMemReader.readU32()).to.eql(arrBufPtr.toNumber())
    expect(arrMemReader.readU32()).to.eql(10)
    expect(arrMemReader.readU32()).to.eql(5)

    const arrBufMem = container.mem.read(arrBufPtr, 10);
    const arrBufReader = new BufReader(arrBufMem)
    expect(arrBufReader.readU16()).to.eql(1)
    expect(arrBufReader.readU16()).to.eql(2)
    expect(arrBufReader.readU16()).to.eql(3)
    expect(arrBufReader.readU16()).to.eql(4)
    expect(arrBufReader.readU16()).to.eql(5)
  })

  it('can lower static array of u16', () => {
    const buf = new BufWriter()
    buf.writeULEB(2)
    buf.writeU16(1)
    buf.writeU16(2)

    const ty = new AbiType({ name: 'StaticArray', args: [AbiType.fromName('u16')], nullable: false })
    let ptr = target.lower(buf.data, ty)

    let rtid = container.abi.rtidFromTypeNode(ty).get()
    let objBuf = container.mem.read(ptr.minus(8), 12)
    let objBufRead = new BufReader(objBuf)
    expect(objBufRead.readU32()).to.eql(rtid.id)
    expect(objBufRead.readU32()).to.eql(4)
    expect(objBufRead.readU16()).to.eql(1)
    expect(objBufRead.readU16()).to.eql(2)
  })
});
