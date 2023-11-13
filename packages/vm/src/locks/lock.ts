import {Lock as CoreLock} from "@aldea/core";

export interface Lock {
  coreLock (): CoreLock;
}

export { CoreLock }
