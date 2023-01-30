import {JigRef} from "../vm/jig-ref.js";
import {Storage, VM} from "../vm/index.js";
import {Pointer} from '@aldea/sdk-js'
import {PublicLock} from "../vm/locks/public-lock.js";
import {Internref} from "../vm/memory.js";
import {expect} from 'chai'

describe('JigRef', function () {
  const storage = new Storage();
  const vm = new VM(storage)
  it('returns right id', () => {
    const id = vm.addPreCompiled(`aldea/flock.wasm`, `aldea/flock.ts`)
    const wasm = vm.createWasmInstance(id)
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
  //   const id = vm.addPreCompiled(`aldea/flock.wasm`, `aldea/flock.ts`)
  //   const wasm = vm.createWasmInstance(id)
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
