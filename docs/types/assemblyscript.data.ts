import { defineLoader } from 'vitepress'
import { loadType, TypeLib } from './shared'

declare const data: TypeLib
export { data }

export default defineLoader({
  async load(): Promise<TypeLib> {
    return loadType('assemblyscript')
  }
})