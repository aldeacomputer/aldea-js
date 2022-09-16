import fs from 'fs'
import { CBOR, Sequence, TaggedValue } from 'cbor-redux'

/*
 * Gert simple VM - just contains map of modules by location
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
          (() => {
            // @external.js
            throw Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`);
          })();
        },
        'console.log'(message) {
          const thisMod = vm.modules.get(path)
          message = __liftString(thisMod, message >>> 0);
          console.log(message)
        }
      },
      vm: {
        vm_call(location, ref, fn, argBuf) {
          const thisMod = vm.modules.get(path)
          location = __liftString(thisMod, location >>> 0);
          ref = ref >>> 0;
          fn = __liftString(thisMod, fn >>> 0);
          argBuf = __liftBuffer(thisMod, argBuf >>> 0)

          const thatMod = vm.modules.get(location)
          console.log('REMOTE CALL', location, ref, fn, argBuf)
          let ret = thatMod.instanceCall(new TaggedValue(ref, 42), fn, [__decodeArgs(argBuf)])
          let retBuf = __encodeArgs([ret])
          retBuf = __lowerBuffer(thisMod, retBuf)
          return retBuf
        }
      }
    })

    return new this(vm, wasm.instance.exports)
  }

  call(fn, args = [], decode = true) {
    if (!Object.keys(this.exports).includes(fn)) {
      throw new Error('unknown function: ' + fn)
    }

    let argBuf = __encodeArgs(args)
    argBuf = __lowerBuffer(this, argBuf) || __notnull()
    let retBuf = __liftBuffer(this, this.exports[fn](argBuf) >>> 0);
    return decode ? __decodeArgs(retBuf) : retBuf
  }
}


async function main() {
  const vm = new VM()
  await vm.load('./build/person.wasm')
  const mod = vm.modules.get('./build/person.wasm')

  console.log('\n---')

  console.log('creating person')
  const ref = mod.call('Person_constructor', ['James', 19])
  const data1 = mod.call('Person$serialize', [ref], false)
  inspectData(data1)

  console.log('mutating person')
  mod.call('Person$rename', [ref, 'Bobby'])
  mod.call('Person$getOlder', [ref, 11])
  const data2 = mod.call('Person$serialize', [ref], false)
  inspectData(data2)


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