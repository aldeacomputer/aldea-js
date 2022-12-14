import { Abi, ClassNode, validateAbi } from '@aldea/compiler/abi'
import { CBOR } from 'cbor-redux';
import { base16 } from './support/base.js'
import { OutputResponse } from './internal.js'

export class Output {
  id: string;
  ref: string;
  pkgId: string;
  expIdx: number;
  state: any[];
  #abi?: Abi;
  #classNode?: ClassNode;

  constructor(data: OutputResponse, abi?: Abi) {
    this.id = data.jigId
    this.ref = data.jigRef
    this.pkgId = data.pkgId
    this.expIdx = data.classIdx

    const stateBuf = base16.decode(data.stateHex)
    const stateSeq = CBOR.decode(stateBuf.buffer, null, { mode: 'sequence' })
    this.state = stateSeq.data

    if (typeof abi !== 'undefined' && validateAbi(abi)) {
      this.#abi = abi
      this.#classNode = this.#abi.exports[this.expIdx].code as ClassNode
    } 
  }

  get className(): string | void {
    if (this.#classNode) {
      return this.#classNode.name
    }
  }

  get props(): any | void {
    if (this.#classNode) {
      return this.#classNode.fields.reduce((props: any, f, i) => {
        props[f.name] = this.state[i]
        return props
      }, {})
    }
  }
}
