export class HttpNotFound extends Error {
  constructor (msg, data) {
    super(msg)
    this.data = data
  }
}
