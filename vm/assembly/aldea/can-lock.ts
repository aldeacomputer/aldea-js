import {canCall, canLock} from "aldea/auth";

export class PublicJig extends Jig {
  adopted: Jig[]
  constructor() {
    super();
    this.$lock.changeToPublicLock()
    this.adopted = []
  }

  adopt (aJig: Jig): void {
    aJig.$lock.changeToJigLock()
    this.adopted.push(aJig)
  }

  checkCanLock(aJig: Jig): bool {
    return canLock(aJig)
  }

  checkCanCall(aJig: Jig): bool {
    return canCall(aJig)
  }
}

export class UserJig extends Jig {
  constructor() {
    super();
  }
  destroy (): void {
    this.$lock.freeze()
  }
}

export class OwnerJig extends Jig {
  myJig: Jig

  constructor(aJig: Jig) {
    super();
    this.myJig = aJig
    this.myJig.$lock.changeToJigLock()
  }
}
