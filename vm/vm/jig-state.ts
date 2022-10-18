import { CBOR } from "cbor-redux"

const parse = (data: ArrayBuffer) => CBOR.decode(data, null, { mode: "sequence" })

export class JigState {
  origin: string;
  location: string;
  className: string;
  stateBuf: ArrayBuffer;
  moduleId: string;
  serializedLock: any;

  constructor (origin: string, location: string, className: string, stateBuf: ArrayBuffer, moduleId: string, lock: any) {
    this.origin = origin
    this.location = location
    this.className = className
    this.stateBuf = stateBuf
    this.moduleId = moduleId
    this.serializedLock = lock
  }

  parsedState(): any[] {
    return parse(this.stateBuf).data
  }
}
