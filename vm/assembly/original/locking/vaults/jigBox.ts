export class JigBox<T> {
  content: T | null;

  constructor() {
    this.content = null
  }

  save (newContent: T): void{
    if (!this.isEmpty()) {}
    this.content = newContent
  }

  isEmpty(): boolean {
    return this.content === null;
  }

  releaseOr<P> (ctx: P, ifNone: (arg: P) => T): T {
    if (this.content === null) {
      return ifNone(ctx)
    } else {
      return this.content
    }
  }

  releaseOrHalt (): T {
    if (this.content === null) {
      throw new Error('nothing to release')
    } else {
      return this.content
    }
  }

  insideOr<R> (fn: (a: T) => R, ifnone: () => R): R {
    if (this.content === null) {
      return ifnone()
    } else {
      return fn(this.content)
    }
  }

  static with<S> (content: S): JigBox<S> {
    const box = new this<S>();
    box.save(content);
    return box;
  }
}
