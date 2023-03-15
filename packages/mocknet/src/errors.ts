export class HttpNotFound extends Error {
  constructor (msg: string, public data: any) {
    super(msg)
  }
}
