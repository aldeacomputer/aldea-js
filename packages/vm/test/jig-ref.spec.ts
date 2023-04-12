import {JigRef} from "../src/jig-ref.js";
import {MomentClock, Storage, VM} from "../src/index.js";
import {Pointer} from '@aldea/sdk-js'
import {PublicLock} from "../src/locks/public-lock.js";
import {Internref} from "../src/memory.js";
import {expect} from 'chai'

describe('JigRef', function () {
  const storage = new Storage()
  const clock = new MomentClock()
  const vm = new VM(storage, clock)
  it('returns right id', () => {
    const id = vm.addPreCompiled(`aldea/flock.wasm`, `aldea/flock.ts`)
    const wasm = vm.wasmForPackageId(id)
    const jig = new JigRef(
      new Internref('Flock', 0),
      1,
      wasm,
      new Pointer(new Uint8Array([0,0,0]), 0),
      new Pointer(new Uint8Array([0,0,0]), 0),
      new PublicLock()
    )

    expect(jig.origin.toBytes()).to.eql(new Pointer(new Uint8Array([0,0,0]), 0).toBytes())
  })

  // it('returns right reference', () => {
  //   const id = src.addPreCompiled(`aldea/flock.wasm`, `aldea/flock.ts`)
  //   const wasm = src.createWasmInstance(id)
  //   const jig = new JigRef(
  //     new Internref('Flock', 0),
  //     1,
  //     wasm,
  //     new Location(new Uint8Array([0,0,0]), 0),
  //     new PublicLock()
  //   )
  //
  //   const jigState = new JigState(
  //     jig.origin,
  //     jig.origin,
  //     jig.classIdx,
  //     jig.serialize(),
  //     jig.package.id,
  //     jig.lock.serialize()
  //   )
  // })
});
