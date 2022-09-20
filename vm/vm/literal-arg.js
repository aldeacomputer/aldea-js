export class LiteralArg {
  constructor (literal) {
    this.literal = literal
  }

  get (_context) {
    return this.literal
  }

  encode () {
    const serialized = typeof this.literal === "number"
      ? this.literal
      : `"${this.literal}"`
    return serialized
  }
}
