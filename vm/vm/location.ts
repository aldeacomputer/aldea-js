import {Transaction} from "./transaction.js";

export function locationF (tx: Transaction, index: number) { return `${tx.id}_${index}` }
