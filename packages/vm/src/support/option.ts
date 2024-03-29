
type empty = null | undefined;
export abstract class Option<T> {
  abstract get(): T
  abstract expect(err: Error): T;
  abstract orElse(fn: () =>T): T

  abstract orDefault(t: T): T
  
  abstract map<Y>(fn: (a: T) => Y): Option<Y>
  abstract filter(fn: (a: T) => boolean): Option<T>;
  abstract or(another: Option<T>): Option<T>
  abstract ifPresent(fn: (t: T) => void): void

  abstract isPresent(): boolean;
  isAbsent(): boolean {
    return !this.isPresent()
  }


  static none<Y> () {
    return new None<Y>()
  }

  static some<Y>(value: Y) {
    return new Some<Y>(value)
  }

  static fromNullable<Y>(valueOrNull: Y | empty) {
    if (valueOrNull === null || valueOrNull === undefined) {
      return this.none<Y>()
    } else {
      return this.some(valueOrNull)
    }
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

  expect (_err: Error): T {
    return this.value
  }

  orElse(_fn: () => T): T {
    return this.value;
  }

  map<Y>(fn: (a: T) => Y): Option<Y> {
    return new Some(fn(this.value));
  }

  filter (fn: (a: T) => boolean): Option<T> {
      if (fn(this.value)) {
        return this
      } else {
        return Option.none()
      }
  }

    orDefault(_t: T): T {
    return this.value;
  }

  or(another: Option<T>): Option<T> {
    return this;
  }

  ifPresent(fn: (t: T) => void): void {
    fn(this.value)
  }

  isPresent (): boolean {
    return true;
  }
}

export class None<T> extends Option<T> {
  get(): T {
    throw new Error('Not present');
  }

  expect (err: Error): T {
    throw err
  }

  orElse(fn: () => T): T {
    return fn();
  }

  map<Y>(fn: (a: T) => Y): Option<Y> {
    return new None<Y>();
  }

  filter (fn: (a: T) => boolean): Option<T> {
      return this;
  }

    orDefault(t: T): T {
    return t;
  }

  or(another: Option<T>): Option<T> {
    return another;
  }

  ifPresent(fn: (t: T) => void): void {
    // no-op
  }

  isPresent (): boolean {
    return false;
  }
}
