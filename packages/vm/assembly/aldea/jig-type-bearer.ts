export class JigTypeBearer extends Jig {
  jigProperty: Jig;

  constructor(jigProperty: Jig) {
    super();
    this.jigProperty = jigProperty;
  }

  getJig (): Jig {
    return this.jigProperty
  }

  setJig (jig: Jig): void {
    this.jigProperty = jig
  }

}
