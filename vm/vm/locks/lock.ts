export interface Lock {
  checkCaller (caller: string): boolean
  serialize (): string
  isOpen (): boolean
}
