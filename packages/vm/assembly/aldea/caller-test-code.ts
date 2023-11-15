
export class Receiver extends Jig {
  checkCallerType (): bool {
    return caller.is<RightCaller>()
  }

  checkCallerTypeStrict (): bool {
    return caller.is<RightCaller>(true)
  }

  checkCallerDataConsistency (): bool {
    const output = caller.getOutputOrFail()
    return this.compareBuffs(output.origin, caller.getOriginOrFail()) &&
      this.compareBuffs(output.location, caller.getLocationOrFail()) &&
      this.compareBuffs(output.classPtr, caller.getClassOrFail())
  }

  callerHasOutput (): bool {
    return caller.hasOutput()
  }

  returnCallerOutputOrigin (): ArrayBuffer {
    return caller.getOutputOrFail().origin
  }

  returnCallerOutputLocation(): ArrayBuffer {
    return caller.getOutputOrFail().location
  }

  returnCallerOutputClassPtr(): ArrayBuffer {
    return caller.getOutputOrFail().classPtr
  }

  returnCallerOrigin(): ArrayBuffer {
    return caller.getOriginOrFail()
  }

  returnCallerLocation(): ArrayBuffer {
    return caller.getLocationOrFail()
  }

  returnCallerClassPtr(): ArrayBuffer {
    return caller.getClassOrFail()
  }

  private compareBuffs (buff1: ArrayBuffer, buff2: ArrayBuffer): bool {
    const array1 =  Uint8Array.wrap(buff1)
    const array2 =  Uint8Array.wrap(buff2)
    if (array1.byteLength !== array2.byteLength) {
      return false
    }
    for (let i = 0; i < array1.length; i++) {
      if (array1[i] !== array2[i]) {
        return false
      }
    }
    return true
  }
}

export class RightCaller extends Jig {
  lastCheck: string = "none"
  lastBuf: ArrayBuffer = new ArrayBuffer(0)

  doTheCall (target: Receiver): bool {
    const ret = target.checkCallerType()
    this.lastCheck = `${ret}`
    return ret
  }

  doTheCallExact (target: Receiver): bool {
    const ret = target.checkCallerTypeStrict()
    this.lastCheck = `${ret}`
    return ret
  }

  doIHaveOutput (target: Receiver): bool {
    const ret = target.callerHasOutput()
    this.lastCheck = `${ret}`
    return ret
  }

  giveMeMyOutputOrigin (target: Receiver): ArrayBuffer {
    const ret = target.returnCallerOutputOrigin()
    this.lastBuf = ret
    return ret
  }

  giveMeMyOutputLocation (target: Receiver): ArrayBuffer {
    const ret = target.returnCallerOutputLocation()
    this.lastBuf = ret
    return ret
  }

  giveMeMyOutputClassPtr (target: Receiver): ArrayBuffer {
    const ret = target.returnCallerOutputClassPtr()
    this.lastBuf = ret
    return ret
  }

  giveMeMyOrigin (target: Receiver): ArrayBuffer {
    const ret = target.returnCallerOrigin()
    this.lastBuf = ret
    return ret
  }
  giveMeMyLocation (target: Receiver): ArrayBuffer {
    const ret = target.returnCallerLocation()
    this.lastBuf = ret
    return ret
  }
  giveMeMyClassPtr (target: Receiver): ArrayBuffer {
    const ret = target.returnCallerClassPtr()
    this.lastBuf = ret
    return ret
  }

  checkMyData (target: Receiver): bool {
    return target.checkCallerDataConsistency()

  }
}

export class SubclassCaller extends RightCaller {
  constructor () {
    super();
  }
}


export class AnotherCaller extends Jig {
  lastCheck: string = "none"
  doTheCall (target: Receiver): bool {
    const ret = target.checkCallerType()
    this.lastCheck = `${ret}`
    return ret
  }
}
