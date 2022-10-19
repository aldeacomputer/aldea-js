import {TransactionWrap} from "./transactionWrap.js";

export function locationF (tx: TransactionWrap, index: number) { return `${tx.id}_${index}` }
