import {Aldea} from "@aldea/sdk-js";

export type AldeaClient = Pick<Aldea, 'getPackageAbi' | 'getUtxosByAddress' | 'commitTx' | 'createTx'>
