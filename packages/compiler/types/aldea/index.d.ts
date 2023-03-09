import 'assemblyscript/std/assembly'
import "../../lib"

declare global {
  // dts builder requires these definitions
  interface CallableFunction extends Function {}
  interface NewableFunction extends Function {}
}
