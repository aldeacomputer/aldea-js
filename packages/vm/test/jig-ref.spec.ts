import {JigRef} from "../src/jig-ref.js";
import {MomentClock, Storage, VM} from "../src/index.js";
import {Pointer} from '@aldea/sdk-js'
import {PublicLock} from "../src/locks/public-lock.js";
import {Internref} from "../src/memory.js";
import {expect} from 'chai'
import {addPreCompiled} from "./util.js";
import {compile} from "@aldea/compiler";

describe('JigRef', function () {
  const storage = new Storage()
  const clock = new MomentClock()
  const vm = new VM(storage, clock, compile)
  it('returns right id', () => {
    const id = addPreCompiled(vm, 'flock')
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
});
