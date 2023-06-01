export class First extends Jig {

}

export class Second extends Jig {
  first: First

  constructor(first: First) {
    super()
    this.first = first
  }
}

export class Third extends Jig {
  second: Second

  constructor(second: Second) {
    super()
    this.second = second
  }
}
