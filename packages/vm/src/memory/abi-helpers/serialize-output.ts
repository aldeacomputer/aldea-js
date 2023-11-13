import {BufWriter, Output} from "@aldea/core";

export function serializeOutput (output: Output): Uint8Array {
  const buf = new BufWriter()
  // serialize $output
  buf.writeBytes(output.origin.toBytes())
  buf.writeBytes(output.location.toBytes())
  buf.writeBytes(output.classPtr.toBytes())

  // Serialize $lock
  buf.writeBytes(output.origin.toBytes())
  buf.writeU32(output.lock.type)
  buf.writeBytes(output.lock.data)

  // Serialize state
  buf.writeFixedBytes(output.stateBuf)

  return buf.data
}
