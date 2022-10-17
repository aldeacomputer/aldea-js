import {CBOR, Sequence} from 'cbor-redux'
import {JigRef} from "./jig-ref.js";
import {
  Abi,
  FieldNode,
  findExportedObject,
  findImportedObject,
  findObjectField,
  findObjectMethod,
  MethodNode,
  TypeNode,
  FieldKind,
  ObjectKind, findPlainObject
} from "@aldea/compiler/abi";
import {
  getObjectMemLayout,
  getTypedArrayConstructor,
  Internref,
  liftBuffer,
  liftInternref, liftObject,
  liftString,
  liftValue,
  lowerInternref,
  lowerObject,
  lowerValue,
} from "./memory.js";
import {ArgReader, readType} from "./arg-reader.js";

// enum AuthCheck {
//   CALL,     // 0 - can the caller call a method?
//   LOCK,     // 1 - can the called lock the jig?
// }

enum LockType {
  NONE,     // 0 - default, vm allows anyone to lock, but prevents function calls
  PUBKEY,   // 1 - vm requires valid signature to call function or change lock
  PARENT,   // 2 - vm requires parent is caller to call function or change lock
  ANYONE,   // 3 - can only be set in constructor, vm allows anyone to call function, but prevents lock change
}

// import {getObjectMemLayout, getTypedArrayConstructor, liftValue} from "@aldea/compiler/dist/vm/memory.js";

export type Prop = {
  node: TypeNode;
  mod: WasmInstance;
  value: any;
}

export type MethodResult = {
  node: TypeNode | null;
  mod: WasmInstance;
  value: any;
}

function __encodeArgs (args: any[]): ArrayBuffer {
  const seq = Sequence.from(args)
  return CBOR.encode(seq)
}

function __decodeArgs (data: ArrayBuffer): any[] {
  return CBOR.decode(data, null, {mode: "sequence"}).data
}

type MethodHandler = (origin: string, methodNode: MethodNode, args: any[]) => MethodResult
type GetPropHandler = (origin: string, propName: string) => Prop
type CreateHandler = (moduleId: string, className: string, args: any[]) => JigRef
type AdoptHandler = (childOrigin: string) => void
type ReleaseHandler = (childOrigin: string, parentOrigin: string) => void
type FindUtxoHandler = (jigPtr: number) => JigRef


const utxoAbiNode = {
  kind: ObjectKind.PLAIN,
  name: 'UtxoState',
  extends: null,
  fields: [
    {
      kind: FieldKind.PUBLIC,
      name: 'origin',
      type: {
        name: 'ArrayBuffer',
        args: []
      }
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'location',
      type: {
        name: 'ArrayBuffer',
        args: []
      }
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'motos',
      type: {
        name: 'u32',
        args: []
      }
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'lock',
      type: {
        name: 'LockState',
        args: []
      }
    }
  ],
  methods: []
}

const lockStateAbiNode = {
  kind: ObjectKind.PLAIN,
  name: 'LockState',
  extends: null,
  fields: [
    {
      kind: FieldKind.PUBLIC,
      name: 'type',
      type: {
        name: 'u8',
        args: []
      }
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'data',
      type: {
        name: 'ArrayBuffer',
        args: []
      }
    }
  ],
  methods: []
}

export class WasmInstance {
  id: string;
  memory: WebAssembly.Memory;
  private methodHandler: MethodHandler;
  private getPropHandler: GetPropHandler;
  private createHandler: CreateHandler;
  private adoptHandler: AdoptHandler;
  private releaseHandler: ReleaseHandler;
  private findUtxoHandler: FindUtxoHandler
  private module: WebAssembly.Module;
  private instance: WebAssembly.Instance;
  abi: Abi;

  constructor (module: WebAssembly.Module, abi: Abi, id: string) {
    this.id = id
    this.abi = abi
    abi.objects.push(utxoAbiNode)
    abi.objects.push(lockStateAbiNode)
    const wasmMemory = new WebAssembly.Memory({initial: 1, maximum: 1})
    this.methodHandler = () => { throw new Error('handler not defined')}
    this.getPropHandler = () => { throw new Error('handler not defined')}
    this.createHandler = () => { throw new Error('handler not defined')}
    this.adoptHandler = () => { throw new Error('handler not defined')}
    this.releaseHandler = () => { throw new Error('handler not defined')}
    this.findUtxoHandler = () => { throw new Error('handler not defined')}
    const imports: any = {
      env: {
        memory: wasmMemory,
        abort: (messagePtr: number, fileNamePtr: number, lineNumber: number, columnNumber: number) => {
          const messageStr = liftString(this, messagePtr);
          const fileNameStr = liftString(this, fileNamePtr);

          (() => {
            // @external.js
            throw Error(`${messageStr} in ${fileNameStr}:${lineNumber}:${columnNumber}`);
          })();
        }
      },
      vm: {
        vm_local_call_start: () => {

        },
        vm_local_call_end: () => {},
        vm_remote_call_i: (targetOriginPtr: number, fnNamePtr: number, argsPtr: number): number => {
          const targetOriginArrBuf = liftBuffer(this, targetOriginPtr)
          const fnStr = liftString(this, fnNamePtr)
          const argBuf = liftBuffer(this, argsPtr)

          const [className, methodName] = fnStr.split('$')
          const obj = findImportedObject(this.abi, className, 'could not find object')
          const method = findObjectMethod(obj, methodName, 'could not find method')



          const argReader = new ArgReader(argBuf)
          const args = method.args.map((n: FieldNode) => {
            return readType(argReader, n.type)
          })

          const methodResult = this.methodHandler(Buffer.from(targetOriginArrBuf).toString(), method, args)
          return lowerValue(this, methodResult.node, methodResult.value)
        },
        vm_remote_call_s: () => {},
        vm_remote_prop: (targetOriginPtr: number, propNamePtr: number): number => {
          const rmtRefBuf = liftBuffer(this, targetOriginPtr)
          const propStr = liftString(this, propNamePtr)
          const propName = propStr.split('.')[1]

          const prop = this.getPropHandler(Buffer.from(rmtRefBuf).toString(), propName)
          return lowerValue(prop.mod, prop.node, prop.value)
        },
        vm_local_authcheck: () => {},
        vm_local_lock: () => {
          console.log('holu')
        },
        vm_local_state: (jigPtr: number): number => {
          const jigRef = this.findUtxoHandler(jigPtr)
          const abiNode = findPlainObject(this.abi, 'UtxoState', 'should be present')
          const utxo = {
            origin: jigRef.origin.toString(),
            location: 'currentlocation', // FIXME: real location,
            motos: 0,
            lock: {
              type: 1,
              data: new ArrayBuffer(0)
            }
          }
          return lowerObject(this, abiNode, utxo)
        },
        vm_remote_lock: (originPtr: number, type: LockType, _argsPtr: number) => {
          const origin = liftBuffer(this, originPtr)
          if (type === LockType.PARENT) {
            this.adoptHandler(Buffer.from(origin).toString())
          } else {
            throw new Error('not implemented yet')
          }
        },
        vm_print: (msgPtr: number ) => {
          console.log(msgPtr)
        },
      }
    }
    this.module = module
    this.instance = new WebAssembly.Instance(this.module, imports)
    this.memory = wasmMemory
  }

  onGetProp (fn: GetPropHandler): void{
    this.getPropHandler = fn
  }

  onMethodCall (fn: MethodHandler) {
    this.methodHandler = fn
  }

  onCreate (fn: CreateHandler) {
    this.createHandler = fn
  }

  onAdopt (fn: AdoptHandler) {
    this.adoptHandler = fn
  }

  onRelease (fn: ReleaseHandler) {
    this.releaseHandler = fn
  }

  onFindUtxo(fn: FindUtxoHandler) {
    this.findUtxoHandler = fn
  }

  setUp () {}

  staticCall (className: string, methodName: string, args: any[]): number {
    const fnName = `${className}_${methodName}`
    const abiObj = findExportedObject(this.abi, className, `unknown export: ${className}`)
    const method = findObjectMethod(abiObj, methodName, `unknown method: ${methodName}`)

    const ptrs = method.args.map((argNode, i) => {
      return lowerValue(this, argNode.type, args[i])
    })


    const fn = this.instance.exports[fnName] as Function;
    return fn(...ptrs)
  }

  createNew (className: string, args: any[]): Internref {
    const ptr = this.staticCall(className, 'constructor', args)
    const abiNode = findExportedObject(this.abi, className, 'should be present')
    return liftInternref(this, abiNode, ptr)
  }

  hidrate (className: string, frozenState: ArrayBuffer): Internref {
    const rawState = __decodeArgs(frozenState)
    const objectNode = findExportedObject(this.abi, className, `unknown class ${className}`)
    const pointer = lowerObject(this, objectNode, rawState)
    return liftInternref(this, objectNode, pointer)
  }

  instanceCall (ref: JigRef, className: string, methodName: string, args: any[] = []): MethodResult {
    const fnName = `${className}$${methodName}`
    const abiObj = findExportedObject(this.abi, className, `unknown export: ${className}`)
    const method = findObjectMethod(abiObj, methodName, `unknown method: ${methodName}`)

    const ptrs = [
      lowerInternref(ref.ref),
      ...method.args.map((argNode, i) => {
        return lowerValue(this, argNode.type, args[i])
      })
    ]

    const fn = this.instance.exports[fnName] as Function;
    const ptr = fn(...ptrs)
    const result = liftValue(this, method.rtype, ptr)
    return {
      mod: this,
      value: result,
      node: method.rtype
    }
  }

  getPropValue (ref: Internref, className: string, fieldName: string): Prop {
    const objNode = findExportedObject(this.abi, className, `unknown export: ${className}`)
    const field = findObjectField(objNode, fieldName, `unknown field: ${fieldName}`)

    const offsets = getObjectMemLayout(objNode)
    const { offset, align } = offsets[field.name]
    const TypedArray = getTypedArrayConstructor(field.type)
    const val = new TypedArray(this.memory.buffer)[ref.ptr + offset >>> align]

    return {
      mod: this,
      value: val,
      node: field.type
    }
    // return liftValue(this, field.type, val)
  }

  __new (a: number, b: number): number {
    const __new = this.instance.exports.__new as Function;
    return __new(a, b)
  }

  __pin (ptr: number): number {
    const __pin = this.instance.exports.__pin as Function;
    return __pin(ptr)
  }

  __unpin (ptr: number): number {
    const __unpin = this.instance.exports.__unpin as Function;
    return __unpin(ptr)
  }

  extractState(ref: Internref, className: string): ArrayBuffer {
    const abiObj = findExportedObject(this.abi, className, 'not found')
    const liftedObject = liftObject(this, abiObj, ref.ptr)

    return __encodeArgs(
      abiObj.fields.map(field => liftedObject[field.name])
    )
    // return __encodeArgs(
    //   abiObj.fields.map((field) => {
    //     return this.getPropValue(ref, className, field.name).value
    //   }, [])
    // )
  }
}
