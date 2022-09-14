export class ExternalRef {
  location: string;
  ref: u32;
}

export class ExternalJig extends ExternalRef  {
  constructor(location: string, ref: u32) {
    super()
    this.location = location
    this.ref = ref
  }
}
