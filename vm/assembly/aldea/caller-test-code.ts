import {Output} from "aldea/output";

export class Receiver extends Jig {
  checkCallerType (): bool {
    return caller.is<RightCaller>()
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
  doTheCall (target: Receiver): bool {
    return target.checkCallerType()
  }

  doIHaveOutput (target: Receiver): bool {
    return target.callerHasOutput()
  }

  giveMeMyOutputOrigin (target: Receiver): ArrayBuffer {
    return target.returnCallerOutputOrigin()
  }

  giveMeMyOutputLocation (target: Receiver): ArrayBuffer {
    return target.returnCallerOutputLocation()
  }

  giveMeMyOutputClassPtr (target: Receiver): ArrayBuffer {
    return target.returnCallerOutputClassPtr()
  }

  giveMeMyOrigin (target: Receiver): ArrayBuffer {
    return target.returnCallerOrigin()
  }
  giveMeMyLocation (target: Receiver): ArrayBuffer {
    return target.returnCallerLocation()
  }
  giveMeMyClassPtr (target: Receiver): ArrayBuffer {
    return target.returnCallerClassPtr()
  }

  checkMyData (target: Receiver): bool {
    return target.checkCallerDataConsistency()
  }
}


export class AnotherCaller extends Jig {
  doTheCall (target: Receiver): bool {
    return target.checkCallerType()
  }
}
