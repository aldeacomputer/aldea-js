import { BufReader, BufWriter } from './internal.js'

/**
 * Generic Serializable interface.
 */
export interface Serializable<T> {
  read(buf: BufReader): T;
  write(buf: BufWriter, item: T): BufWriter;
}
