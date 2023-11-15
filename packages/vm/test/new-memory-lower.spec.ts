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
import {BUF_RTID, emptyTn, STRING_RTID} from "../src/memory/well-known-abi-nodes.js";


const FLOAT_ERROR: number = 0.00001

function checkOutput (container: WasmContainer, outputPtr: WasmWord, extOrigin: Uint8Array, extLocation: Uint8Array, extClassPtr: Uint8Array) {
  const outputReader = container.mem.read(outputPtr.minus(8), 20)
  const outputRtid = container.abi.rtIdByName('Output').get()
  expect(outputReader.readU32()).to.eql(outputRtid.id)
  expect(outputReader.readU32()).to.eql(12)
  const originPtr = WasmWord.fromNumber(outputReader.readU32())
  const locationPtr = WasmWord.fromNumber(outputReader.readU32())
  const classPtrPtr = WasmWord.fromNumber(outputReader.readU32())

  expect(container.mem.extract(originPtr, 34)).to.eql(extOrigin)
  expect(container.mem.extract(locationPtr, 34)).to.eql(extLocation)
  expect(container.mem.extract(classPtrPtr, 34)).to.eql(extClassPtr)
}

function checkLock (container: WasmContainer, lockPtr: WasmWord, extOrigin: Uint8Array, lockType: LockType, lockData: Uint8Array) {
  const lockReader = container.mem.read(lockPtr.minus(8), 20)
  const lockRtid = container.abi.rtIdByName('Lock').get()
  expect(lockReader.readU32()).to.eql(lockRtid.id)
  expect(lockReader.readU32()).to.eql(12)
  const lockOriginPtr = WasmWord.fromNumber(lockReader.readU32());
  expect(lockReader.readI32()).to.eql(lockType)
  const lockDataPtr = WasmWord.fromNumber(lockReader.readU32())
  expect(container.mem.extract(lockOriginPtr, 34)).to.eql(extOrigin)
  expect(container.mem.extract(lockDataPtr, lockData.byteLength)).to.eql(lockData)
}

describe('NewMemoryLower', () => {
  let modIdFor: (key: string) => Uint8Array
  let storage: Storage;
  let container: WasmContainer;
  let jigData: Map<string, JigData>

  let target: LowerValue
  beforeEach(() => {
    const data = buildVm([
      'test-types',
      'test-types-export'
    ])

    modIdFor = data.modIdFor
    storage = data.storage

    let pkgData = storage.getPkg(base16.encode(modIdFor('test-types'))).get()

    container = new WasmContainer(pkgData.mod, pkgData.abi, pkgData.id)
    jigData = new Map<string, JigData>()
    target = new LowerValue(container, (ptr) => Option.fromNullable(jigData.get(ptr.toString())))
  })

  it('can lower an u8', () => {
    const inputBuf = new BufWriter()
    inputBuf.writeU8(10)
    const ty = AbiType.fromName('u8')
    let ptr = target.lower(inputBuf.data, ty)

    expect(ptr.toInt()).to.eql(10)
  })

  it('can lower u16', () => {
    const buf = new BufWriter()
    buf.writeU16(10)
    const ty = AbiType.fromName('u16')

    let ptr = target.lower(buf.data, ty)
    expect(ptr.toInt()).to.eql(10)
  })

  it('can lower u32', () => {
    const buf = new BufWriter()
    buf.writeU32(10)
    const ty = AbiType.fromName('u32')

    let ptr = target.lower(buf.data, ty)
    expect(ptr.toInt()).to.eql(10)
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

    expect(ptr.toInt()).to.eql(-1)
  })

  it('can lower an i16', () => {
    const buf = new BufWriter()
    buf.writeU16(-1)
    const ty = AbiType.fromName('i16')
    let ptr = target.lower(buf.data, ty)

    expect(ptr.toInt()).to.eql(-1)
  })

  it('can lower an i32', () => {
    const buf = new BufWriter()
    buf.writeU32(-1)
    const ty = AbiType.fromName('i32')
    let ptr = target.lower(buf.data, ty)

    expect(ptr.toInt()).to.eql(-1)
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

    expect(ptr.toFloat()).to.be.approximately(-1.2, FLOAT_ERROR)
  })

  it('can lower an f64', () => {
    const buf = new BufWriter()
    buf.writeF64(-1.2)
    const ty = AbiType.fromName('f64')
    let ptr = target.lower(buf.data, ty)

    expect(ptr.toFloat()).to.eql(-1.2)
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
    let objHeader = container.mem.extract(ptr.minus(8), 8);

    let rtid = container.abi.rtIdByName('Array<u8>')
    const objHeaderReader = new BufReader(objHeader)
    expect(objHeaderReader.readU32()).to.eql(rtid.get().id)
    expect(objHeaderReader.readU32()).to.eql(16)

    const arrMem = container.mem.extract(ptr, 16);
    const arrMemReader = new BufReader(arrMem)
    const arrBufPtr = WasmWord.fromNumber(arrMemReader.readU32())
    expect(arrMemReader.readU32()).to.eql(arrBufPtr.toInt())
    expect(arrMemReader.readU32()).to.eql(5)
    expect(arrMemReader.readU32()).to.eql(5)

    const arrBufMem = container.mem.extract(arrBufPtr, 5);
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

    const arrMem = container.mem.extract(ptr, 16);
    const arrMemReader = new BufReader(arrMem)
    const arrBufPtr = WasmWord.fromNumber(arrMemReader.readU32())
    expect(arrMemReader.readU32()).to.eql(arrBufPtr.toInt())
    expect(arrMemReader.readU32()).to.eql(10)
    expect(arrMemReader.readU32()).to.eql(5)

    const arrBufMem = container.mem.extract(arrBufPtr, 10);
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
    let objBuf = container.mem.extract(ptr.minus(8), 12)
    let objBufRead = new BufReader(objBuf)
    expect(objBufRead.readU32()).to.eql(rtid.id)
    expect(objBufRead.readU32()).to.eql(4)
    expect(objBufRead.readU16()).to.eql(1)
    expect(objBufRead.readU16()).to.eql(2)
  })

  it('can lower ArrayBuffer', () => {
    const buf = new BufWriter()
    const bufContent = new Uint8Array([0,1,2,3,4,5,6,7,8,9]);
    buf.writeBytes(bufContent)

    const ty = AbiType.fromName('ArrayBuffer')
    let ptr = target.lower(buf.data, ty)

    let objBuf = container.mem.extract(ptr.minus(8), 18)
    let objBufRead = new BufReader(objBuf)
    expect(objBufRead.readU32()).to.eql(BUF_RTID)
    expect(objBufRead.readU32()).to.eql(bufContent.byteLength)
    expect(objBufRead.readFixedBytes(10)).to.eql(bufContent)
  })


  it('can lower typed arrays', () => {
    type TypedArray = Uint8Array |
      Uint16Array |
      Uint32Array |
      BigInt64Array |
      Int8Array |
      Int16Array |
      Int32Array |
      Float32Array |
      Float64Array

    type TypedConstructorTuple = [TypedArray, string]

    const typedArrays: TypedConstructorTuple[] = [
      [new Uint8Array([1,2,3]), 'Uint8Array'],
      [new Uint16Array([1,2,3]), 'Uint16Array'],
      [new Uint32Array([1,2,3]), 'Uint32Array'],
      [new BigInt64Array([1n,2n,3n]), 'Uint64Array'],
      [new Int8Array([-1,-2,-3]), 'Int8Array'],
      [new Int16Array([-1,-2,-3]), 'Int16Array'],
      [new Int32Array([-1,-2,-3]), 'Int32Array'],
      [new BigInt64Array([-1n, -2n, -3n]), 'Int64Array'],
      [new Float32Array([1.1, 1.2, 1.3]), 'Float32Array'],
      [new Float64Array([1.1, 1.2, 1.3]), 'Float64Array']
    ]

    for (const [typedArray, name] of typedArrays) {
      const buf = new BufWriter()
      const bufContent = typedArray;
      buf.writeBytes(new Uint8Array(bufContent.buffer))

      const ty = AbiType.fromName(name)
      const ptr = target.lower(buf.data, ty)

      const rtId = container.abi.rtidFromTypeNode(ty).get()
      const objBuf = container.mem.read(ptr.minus(8), 12)
      expect(objBuf.readU32()).to.eql(rtId.id)
      expect(objBuf.readU32()).to.eql(12)

      const bufPtr = WasmWord.fromNumber(objBuf.readU32())
      const contentMem = container.mem.read(bufPtr, bufContent.buffer.byteLength)
      expect(contentMem.readFixedBytes(bufContent.buffer.byteLength)).to.eql(new Uint8Array(bufContent.buffer))
    }
  })

  it('can lower strings', () => {
    const buf = new BufWriter()
    const aString = "this is a string";
    buf.writeBytes(new Uint8Array(Buffer.from(aString)))

    const ty = AbiType.fromName('string')
    let ptr = target.lower(buf.data, ty)

    let header = container.mem.read(ptr.minus(8), 8)
    expect(header.readU32()).to.eql(STRING_RTID)
    const bufStrLength = header.readU32();
    expect(bufStrLength).to.eql(aString.length * 2) // Saved as utf-16
    const buffer = container.mem.extract(ptr, bufStrLength)
    expect(Buffer.from(buffer).toString('utf16le')).to.eql(aString)
  })

  it('can lower a plain object', () => {
    const bcs = new BCS(container.abi.abi)
    const obj = {
      name: 'outer',
      obj: {
        age: 15,
        intraName: 'intra'
      },
      value: 10
    }
    const buf = bcs.encode('SomeExportedClass', obj)

    const ty = AbiType.fromName('SomeExportedClass')
    let ptr = target.lower(buf, ty)

    let rtId1 = container.abi.rtidFromTypeNode(ty).get()

    const obj1Read = container.mem.read(ptr.minus(8), 20); // 8 + 4 * 3
    expect(obj1Read.readU32()).to.eql(rtId1.id)
    expect(obj1Read.readU32()).to.eql(12)
    const strPtr = WasmWord.fromNumber(obj1Read.readU32())
    const innerObjPtr = WasmWord.fromNumber(obj1Read.readU32())
    expect(obj1Read.readU32()).to.eql(10)

    const strReader = container.mem.read(strPtr.minus(8), obj.name.length * 2 + 8); // 8 + 4 * 3
    expect(strReader.readU32()).to.eql(STRING_RTID)
    expect(strReader.readU32()).to.eql(obj.name.length * 2)
    const val = strReader.readFixedBytes(obj.name.length * 2);
    expect(Buffer.from(val).toString('utf16le'), obj.name)

    const innerObjReader = container.mem.read(innerObjPtr.minus(8), 8 + 8) // header + data
    const innerObjRtid = container.abi.rtIdByName('SomeExportedIntraClass').get()

    expect(innerObjReader.readU32()).to.eql(innerObjRtid.id)
    expect(innerObjReader.readU32()).to.eql(8)
    const innerStrPtr = WasmWord.fromNumber(innerObjReader.readU32())
    expect(innerObjReader.readU32()).to.eql(15)

    const innerStrRead = container.mem.read(innerStrPtr, obj.obj.intraName.length * 2)
    const innerStrBytes = innerStrRead.readFixedBytes(obj.obj.intraName.length * 2)
    expect(Buffer.from(innerStrBytes).toString('utf16le')).to.eql(obj.obj.intraName)
  })

  it('can lower imported jig', () => {
    const buf = new BufWriter()
    const data = [1,2,3,4,5,6,7,8]
    const someTxId = new Uint8Array([...data, ...data, ...data, ...data])
    const externalJigOrigin = new Pointer(someTxId, 9)

    const extOrigin = new Uint8Array(34).fill(1)
    const extLocation = new Uint8Array(34).fill(2)
    const extClassPtr = new Uint8Array(34).fill(3)

    jigData.set(externalJigOrigin.toString(), {
      origin: Pointer.fromBytes(extOrigin),
      location: Pointer.fromBytes(extLocation),
      classPtr: Pointer.fromBytes(extClassPtr),
      lock: new PublicLock()
    })

    buf.writeFixedBytes(externalJigOrigin.toBytes())

    const ty = AbiType.fromName('ImportedClass')

    const objPtr = target.lower(buf.data, ty)

    const objReader = container.mem.read(objPtr.minus(8), 16)
    const objRtId = container.abi.rtIdByName(ty.name).get()
    expect(objReader.readU32()).to.eql(objRtId.id)
    expect(objReader.readU32()).to.eql(8) // Size of a proxy
    const outputPtr = WasmWord.fromNumber(objReader.readU32());
    const lockPtr = WasmWord.fromNumber(objReader.readU32());

    checkOutput(container, outputPtr, extOrigin, extLocation, extClassPtr);
    checkLock(container, lockPtr, extOrigin, LockType.PUBLIC, new Uint8Array());
  })


  it('can lower imported object', () => {
    const buf = new BufWriter()
    buf.writeI32(1)
    buf.writeF64(1.5)
    const prop3 = "prop3";
    buf.writeBytes(Buffer.from(prop3))

    const ty = AbiType.fromName('ImportedObj')
    const impObjPtr = target.lower(buf.data, ty)


    const impObjRead = container.mem.read(impObjPtr.minus(8), 28)
    const impObjRtId = container.abi.rtidFromTypeNode(ty).get()
    expect(impObjRead.readU32()).to.eql(impObjRtId.id)
    expect(impObjRead.readU32()).to.eql(20)
    expect(impObjRead.readU32()).to.eql(1)
    impObjRead.readU32() // Empty space for alligment
    expect(impObjRead.readF64()).to.eql(1.5)
    const strPtr = WasmWord.fromNumber(impObjRead.readU32())

    const strRead = container.mem.read(strPtr, prop3.length * 2)
    const strBuf = Buffer.from(strRead.readFixedBytes(prop3.length * 2))
    expect(strBuf.toString('utf16le')).to.eql(prop3)
  })

  it('can lower real jig', () => {
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

    const jigPtr = target.lower(outputBuf, ty)

    const jigRead = container.mem.read(jigPtr.minus(8), 24)
    const rtId = container.abi.rtidFromTypeNode(ty).get()
    expect(jigRead.readU32()).to.eql(rtId.id)
    expect(jigRead.readU32()).to.eql(16)
    jigRead.readU32()
    jigRead.readU32()
    expect(jigRead.readU32()).to.eql(aNumber)
  })

  it('can lower an exported jig proxy', () => {
    const data = [1,2,3,4,5,6,7,8]
    const someTxId = new Uint8Array([...data, ...data, ...data, ...data])
    const externalJigOrigin = new Pointer(someTxId, 9)

    const extLocation = new Uint8Array(34).fill(2)
    const extClassPtr = new Uint8Array(34).fill(3)
    const addrBuf = new Uint8Array(20).fill(5)

    jigData.set(externalJigOrigin.toString(), {
      origin: Pointer.fromBytes(externalJigOrigin.toBytes()),
      location: Pointer.fromBytes(extLocation),
      classPtr: Pointer.fromBytes(extClassPtr),
      lock: new AddressLock(new Address(addrBuf))
    })

    const ty = AbiType.fromName('SmallJig')

    const proxyPtr = target.lower(externalJigOrigin.toBytes(), ty)
    const proxyRtId = container.abi.rtidFromTypeNode(ty).get()
    const proxyRead = container.mem.read(proxyPtr.minus(8), 16)
    expect(proxyRead.readU32()).to.eql(proxyRtId.id)
    expect(proxyRead.readU32()).to.eql(8)
    const outputPtr =  WasmWord.fromNumber(proxyRead.readU32())
    const lockPtr = WasmWord.fromNumber(proxyRead.readU32())

    checkOutput(container, outputPtr, externalJigOrigin.toBytes(), extLocation, extClassPtr)
    checkLock(container, lockPtr, externalJigOrigin.toBytes(), LockType.ADDRESS, addrBuf);
  })

  it('can lower a map', () => {
    const buf = new BufWriter()
    buf.writeULEB(10)
    new Array(10).fill(0).forEach((_, i) => {
      buf.writeBytes(Buffer.from(`key ${i}`))
      buf.writeBytes(Buffer.from(`value ${i}`))
    })


    const ty = new AbiType({ name: 'Map', nullable: false, args: [emptyTn('string'), emptyTn('string')] });
    const mapPtr = target.lower(buf.data, ty)
    const mapRtId = container.abi.rtidFromTypeNode(ty).get()

    const mapRead = container.mem.read(mapPtr.minus(8), 32)
    expect(mapRead.readU32()).to.eql(mapRtId.id)

    const res = container.callFn('checkMap', [mapPtr, WasmWord.fromNumber(10)], [ty, AbiType.fromName('u32')])
    expect(res.get().toInt()).to.eql(1) // truthy value
  })

  it('can lower a set', () => {
    const buf = new BufWriter()
    buf.writeULEB(10)
    new Array(10).fill(0).forEach((_, i) => {
      buf.writeBytes(Buffer.from(`value ${i}`))
    })


    const ty = new AbiType({ name: 'Set', nullable: false, args: [emptyTn('string')] });
    const setPtr = target.lower(buf.data, ty)
    const setRtid = container.abi.rtidFromTypeNode(ty).get()

    const setReader = container.mem.read(setPtr.minus(8), 32)
    expect(setReader.readU32()).to.eql(setRtid.id)

    const res = container.callFn('checkSet', [setPtr, WasmWord.fromNumber(10)], [ty, AbiType.fromName('u32')])
    expect(res.get().toInt()).to.eql(1) // truthy value
  })
});
