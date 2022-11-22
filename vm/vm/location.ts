import {Transaction} from "./transaction.js";
import {Location} from "@aldea/sdk-js";

export function locationF (tx: Transaction, index: number): Location {
  return new Location(tx.hash(), index)
}
