export abstract class Option<T> {
  abstract get(): T
  abstract orElse(fn: () =>T): T
  
  abstract map<Y>(fn: (a: T) => Y): Option<Y>

  static none<Y> () {
    return new None<Y>()
  }

  static some<Y>(value: Y) {
    return new Some<Y>(value)
  }
}

export class Some<T> extends Option<T> {
  value: T

  constructor(t: T) {
    super()
    this.value = t
  }
  get(): T {
    return this.value;
  }

  orElse(_fn: () => T): T {
    return this.value;
  }

  map<Y>(fn: (a: T) => Y): Option<Y> {
    return new Some(fn(this.value));
  }
}

export class None<T> extends Option<T> {
  get(): T {
    throw new Error('Not present');
  }

  orElse(fn: () => T): T {
    return fn();
  }

  map<Y>(fn: (a: T) => Y): Option<Y> {
    return new None<Y>();
  }
}
