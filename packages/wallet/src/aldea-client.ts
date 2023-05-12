import {Aldea} from "@aldea/sdk";

export type AldeaClient = Pick<Aldea, 'getPackageAbi' | 'getUtxosByAddress' | 'commitTx' | 'createTx'>
