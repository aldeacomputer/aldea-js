import { CBOR } from "cbor-redux"
import {Lock} from "./locks/lock.js";

const parse = (data: Uint8Array) => CBOR.decode(data.buffer, null, { mode: "sequence" })

export class JigState {
  origin: string;
  location: string;
  className: string;
  stateBuf: Uint8Array;
  moduleId: string;
  serializedLock: any;

  constructor (origin: string, location: string, className: string, stateBuf: Uint8Array, moduleId: string, lock: any) {
    this.origin = origin
    this.location = location
    this.className = className
    this.stateBuf = stateBuf
    this.moduleId = moduleId
    this.serializedLock = lock
  }

  parsedState() {
    return parse(this.stateBuf).data
  }
}
