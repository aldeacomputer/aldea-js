export const OP_IMMEDIATES = {
  "block": "block_type",
  "loop": "block_type",
  "if": "block_type",
  "br": "varuint32",
  "br_if": "varuint32",
  "br_table": "br_table",
  "call": "varuint32",
  "call_indirect": "call_indirect",
  "get_local": "varuint32",
  "set_local": "varuint32",
  "tee_local": "varuint32",
  "get_global": "varuint32",
  "set_global": "varuint32",
  "load": "memory_immediate",
  "load8_s": "memory_immediate",
  "load8_u": "memory_immediate",
  "load16_s": "memory_immediate",
  "load16_u": "memory_immediate",
  "load32_s": "memory_immediate",
  "load32_u": "memory_immediate",
  "store": "memory_immediate",
  "store8": "memory_immediate",
  "store16": "memory_immediate",
  "store32": "memory_immediate",
  "current_memory": "varuint1",
  "grow_memory": "varuint1",
  "i32": "varint32",
  "i64": "varint64",
  "f32": "uint32",
  "f64": "uint64"
}
