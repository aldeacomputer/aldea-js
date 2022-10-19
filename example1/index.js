import fs from 'fs'
import { CBOR, Sequence, TaggedValue } from 'cbor-redux'

/*
 * Gert simple Vm - just contains map of modules by location
 */
class VM {
  constructor() {
    this.modules = new Map()
  }

  async load(path) {
    const module = await Module.load(this, path)
    this.modules.set(path, module)
  }
}

/*
 * Gert simple Wasm Module
 */
class Module {
  constructor(vm, exports) {
    this.vm = vm
    this.exports = exports
    this.memory = exports.memory
  }

  static async load(vm, path) {
    const wasmBuf = fs.readFileSync(path)
    const wasm = await WebAssembly.instantiate(wasmBuf, {
      env: {
        abort(message, fileName, lineNumber, columnNumber) {
          const thisMod = vm.modules.get(path)
          // ~lib/builtins/abort(~lib/string/String | null?, ~lib/string/String | null?, u32?, u32?) => void
          message = __liftString(thisMod, message >>> 0);
          fileName = __liftString(thisMod, fileName >>> 0);
          lineNumber = lineNumber >>> 0;
          columnNumber = columnNumber >>> 0;
          // (() => {
          //   // @external.js
          //   throw Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`);
          // })();
          throw new Error(`abort was called ${message}`)
        },
        'console.log'(message) {
          const thisMod = vm.modules.get(path)
          message = __liftString(thisMod, message >>> 0);
          console.log(message)
        }
      },
      vm: {
        vm_call(location, fn, argBuf) {
          const thisMod = vm.modules.get(path)
          location = __liftString(thisMod, location >>> 0);
          fn = __liftString(thisMod, fn >>> 0);
          argBuf = __liftBuffer(thisMod, argBuf >>> 0)

          const thatMod = vm.modules.get(location)
          console.log('REMOTE CALL', location, fn, argBuf)
          let retBuf = thatMod.call(fn, [__decodeArgs(argBuf)], false)
          retBuf = __lowerBuffer(thisMod, retBuf)
          return retBuf
        },
        vm_prop(location, fn, argBuf) {
          const thisMod = vm.modules.get(path)
          location = __liftString(thisMod, location >>> 0);
          fn = __liftString(thisMod, fn >>> 0);
          argBuf = __liftBuffer(thisMod, argBuf >>> 0)

          const thatMod = vm.modules.get(location)
          const [name, prop] = fn.split('$')
          console.log('REMOTE PROP', location, name, prop)

          const schema = thatMod.call(`${name}_schema`, [__decodeArgs(argBuf)])
          const data = thatMod.call(`${name}$serialize`, [__decodeArgs(argBuf)])
          const idx = Object.keys(schema).indexOf(prop)
          const seq = Sequence.from([idx > 0 ? data.get(idx) : data])
          
          let retBuf = new Uint8Array(CBOR.encode(seq))
          retBuf = __lowerBuffer(thisMod, retBuf)
          return retBuf
        }
      }
    })

    return new this(vm, wasm.instance.exports)
  }

  call (fn, args = [], decode = true) {
    if (!Object.keys(this.exports).includes(fn)) {
      throw new Error('unknown function: ' + fn)
    }

    let argBuf = __encodeArgs(args)
    console.log(argBuf)
    argBuf = __lowerBuffer(this, argBuf) || __notnull()
    console.log(argBuf)
    console.log(fn)
    let retBuf = __liftBuffer(this, this.exports[fn](argBuf) >>> 0);
    return decode ? __decodeArgs(retBuf) : retBuf
  }
}


async function main() {
  const vm = new VM()
  await vm.load('./build/fighter.wasm')
  await vm.load('./build/weapon.wasm')
  const mod1 = vm.modules.get('./build/fighter.wasm')
  const mod2 = vm.modules.get('./build/weapon.wasm')

  console.log('\n---')

  // console.log('\ncreating player 1')
  // const p1 = mod1.call('Fighter_constructor', ['Zangief'])
  // inspectData( mod1.call('Fighter$serialize', [p1], false) )
  //
  // console.log('\ncreating player 2')
  // const p2 = mod1.call('Fighter_constructor', ['E. Honda'])
  // inspectData( mod1.call('Fighter$serialize', [p2], false) )

  console.log('\ncreating weapon')
  const w1 = mod2.call('Weapon_constructor', ['ancho', 10])
  inspectData( mod2.call('Weapon$serialize', [w1], false) )

  // console.log('\ncreating another weapon')
  // const w2 = mod2.call('Weapon_constructor', ['Harpe', 64])
  // inspectData( mod2.call('Weapon$serialize', [w2], false) )
  //
  // console.log('\nequip swords')
  // mod1.call('Fighter$equip', [p1, w1])
  // mod1.call('Fighter$equip', [p2, w2])
  // inspectData( mod1.call('Fighter$serialize', [p1], false) )
  // inspectData( mod1.call('Fighter$serialize', [p2], false) )
  //
  // console.log('\nFIGHT')
  // const result = mod1.call('Fighter$battle', [p1, p2])
  // console.log(result)
  // inspectData( mod1.call('Fighter$serialize', [p1], false) )
  // inspectData( mod1.call('Fighter$serialize', [p2], false) )

}


/**
 * HELPERS
 */
function inspectData(data) {
  console.log(CBOR.decode(data.buffer, null, { mode: "sequence" }))
}

function __encodeArgs(args) {
  if (args instanceof Uint8Array) { return args }
  const seq = Sequence.from(args)
  return new Uint8Array(CBOR.encode(seq))
}

function __decodeArgs(data) {
  const seq = CBOR.decode(data.buffer, null, { mode: "sequence" })
  if (seq instanceof Sequence && seq.size == 1) {
    return seq.get(0)
  }
  return seq
}

function __liftString(mod, pointer) {
  if (!pointer) return null;
  const
    end = pointer + new Uint32Array(mod.memory.buffer)[pointer - 4 >>> 2] >>> 1,
    memoryU16 = new Uint16Array(mod.memory.buffer);
  let
    start = pointer >>> 1,
    string = "";
  while (end - start > 1024) string += String.fromCharCode(...memoryU16.subarray(start, start += 1024));
  return string + String.fromCharCode(...memoryU16.subarray(start, end));
}

function __liftBuffer(mod, pointer) {
  if (!pointer) return null;
  const memoryU32 = new Uint32Array(mod.memory.buffer);
  return new Uint8Array(
    mod.memory.buffer,
    memoryU32[pointer + 4 >>> 2],
    memoryU32[pointer + 8 >>> 2]
  ).slice();
}

function __lowerBuffer(mod, values) {
  if (values == null) return 0;
  const
    length = values.length,
    buffer = mod.exports.__pin(mod.exports.__new(length << 0, 0)) >>> 0,
    header = mod.exports.__new(12, 3) >>> 0,
    memoryU32 = new Uint32Array(mod.memory.buffer);
  memoryU32[header + 0 >>> 2] = buffer;
  memoryU32[header + 4 >>> 2] = buffer;
  memoryU32[header + 8 >>> 2] = length << 0;
  new Uint8Array(mod.memory.buffer, buffer, length).set(values);
  mod.exports.__unpin(buffer);
  return header;
}

function __notnull() {
  throw TypeError("value must not be null");
}


main()
