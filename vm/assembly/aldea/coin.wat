(module
 (type $i32_i32_i32_=>_none (func (param i32 i32 i32)))
 (type $i32_=>_i32 (func (param i32) (result i32)))
 (type $i32_i32_=>_i32 (func (param i32 i32) (result i32)))
 (type $none_=>_none (func))
 (type $i32_i32_=>_none (func (param i32 i32)))
 (type $i64_=>_i32 (func (param i64) (result i32)))
 (type $i32_=>_none (func (param i32)))
 (type $i64_i32_i32_i32_=>_i64 (func (param i64 i32 i32 i32) (result i64)))
 (type $i32_i32_i32_i32_=>_none (func (param i32 i32 i32 i32)))
 (type $i32_i64_i32_=>_i32 (func (param i32 i64 i32) (result i32)))
 (import "env" "memory" (memory $0 1))
 (import "env" "abort" (func $~lib/builtins/abort (param i32 i32 i32 i32)))
 (import "vm" "vm_constructor" (func $~lib/aldea/imports/vm_constructor (param i32 i32)))
 (import "vm" "vm_local_call_start" (func $~lib/aldea/imports/vm_local_call_start (param i32 i32)))
 (import "vm" "vm_remote_state" (func $~lib/aldea/imports/vm_remote_state (param i32) (result i32)))
 (import "vm" "vm_local_state" (func $~lib/aldea/imports/vm_local_state (param i32) (result i32)))
 (import "vm" "vm_remote_lock" (func $~lib/aldea/imports/vm_remote_lock (param i32 i32 i32)))
 (import "vm" "vm_local_lock" (func $~lib/aldea/imports/vm_local_lock (param i32 i32 i32)))
 (import "vm" "vm_local_call_end" (func $~lib/aldea/imports/vm_local_call_end))
 (global $~lib/rt/stub/offset (mut i32) (i32.const 0))
 (global $~lib/aldea/jig/LOCK_CACHE (mut i32) (i32.const 0))
 (global $~lib/aldea/jig/OUTPUT_CACHE (mut i32) (i32.const 0))
 (global $~lib/rt/__rtti_base i32 (i32.const 2016))
 (global $~started (mut i32) (i32.const 0))
 (data (i32.const 1036) "<\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00(\00\00\00A\00l\00l\00o\00c\00a\00t\00i\00o\00n\00 \00t\00o\00o\00 \00l\00a\00r\00g\00e\00\00\00\00\00")
 (data (i32.const 1100) "<\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00\1e\00\00\00~\00l\00i\00b\00/\00r\00t\00/\00s\00t\00u\00b\00.\00t\00s\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00")
 (data (i32.const 1164) "\1c\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00\08\00\00\00C\00o\00i\00n\00\00\00\00\00")
 (data (i32.const 1196) ",\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00\12\00\00\00C\00o\00i\00n\00$\00s\00e\00n\00d\00\00\00\00\00\00\00\00\00\00\00")
 (data (i32.const 1244) "<\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00 \00\00\00n\00o\00t\00 \00e\00n\00o\00u\00g\00h\00 \00c\00o\00i\00n\00s\00\00\00\00\00\00\00\00\00\00\00\00\00")
 (data (i32.const 1308) "<\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00,\00\00\00a\00s\00s\00e\00m\00b\00l\00y\00/\00a\00l\00d\00e\00a\00/\00c\00o\00i\00n\00.\00t\00s\00")
 (data (i32.const 1372) ",\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00\1c\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00l\00e\00n\00g\00t\00h\00")
 (data (i32.const 1420) "<\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00&\00\00\00~\00l\00i\00b\00/\00a\00r\00r\00a\00y\00b\00u\00f\00f\00e\00r\00.\00t\00s\00\00\00\00\00\00\00")
 (data (i32.const 1484) "<\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00&\00\00\00u\00n\00e\00x\00p\00e\00c\00t\00e\00d\00 \00d\00o\00w\00n\00c\00a\00s\00t\00\00\00\00\00\00\00")
 (data (i32.const 1548) "<\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00(\00\00\00~\00l\00i\00b\00/\00a\00l\00d\00e\00a\00/\00o\00u\00t\00p\00u\00t\00.\00t\00s\00\00\00\00\00")
 (data (i32.const 1612) "<\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00$\00\00\00K\00e\00y\00 \00d\00o\00e\00s\00 \00n\00o\00t\00 \00e\00x\00i\00s\00t\00\00\00\00\00\00\00\00\00")
 (data (i32.const 1676) ",\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00\16\00\00\00~\00l\00i\00b\00/\00m\00a\00p\00.\00t\00s\00\00\00\00\00\00\00")
 (data (i32.const 1724) "l\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00\\\00\00\00i\00n\00v\00a\00l\00i\00d\00 \00l\00o\00c\00k\00 \00d\00a\00t\00a\00.\00 \00p\00u\00b\00k\00e\00y\00H\00a\00s\00h\00 \00m\00u\00s\00t\00 \00b\00e\00 \002\000\00 \00b\00y\00t\00e\00s\00")
 (data (i32.const 1836) "<\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00$\00\00\00~\00l\00i\00b\00/\00a\00l\00d\00e\00a\00/\00l\00o\00c\00k\00.\00t\00s\00\00\00\00\00\00\00\00\00")
 (data (i32.const 1900) ",\00\00\00\00\00\00\00\00\00\00\00\01\00\00\00\14\00\00\00C\00o\00i\00n\00$\00m\00e\00r\00g\00e\00\00\00\00\00\00\00\00\00")
 (data (i32.const 1948) "\1c\00\00\00\00\00\00\00\00\00\00\00\r\00\00\00\08\00\00\00\01\00\00\00\00\00\00\00\00\00\00\00")
 (data (i32.const 1980) "\1c\00\00\00\00\00\00\00\00\00\00\00\0e\00\00\00\08\00\00\00\02\00\00\00\00\00\00\00\00\00\00\00")
 (data (i32.const 2016) "\0f\00\00\00 \00\00\00\00\00\00\00 \00\00\00\00\00\00\00\00\00\00\00\00\00\00\00 \00\00\00\04\00\00\00 \00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\10A\82\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\10A\82\00\00\00\00\00\00\00\00\00\04\00\00\00\02A\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00")
 (table $0 3 3 funcref)
 (elem $0 (i32.const 1) $assembly/aldea/coin/Coin#_merge~anonymous|0 $assembly/aldea/coin/Coin#_merge~anonymous|1)
 (export "Coin_constructor" (func $assembly/aldea/coin/Coin_constructor))
 (export "Coin$send" (func $assembly/aldea/coin/Coin$send))
 (export "Coin$merge" (func $assembly/aldea/coin/Coin$merge))
 (export "__new" (func $~lib/rt/stub/__new))
 (export "__pin" (func $~lib/rt/stub/__pin))
 (export "__unpin" (func $~lib/rt/stub/__unpin))
 (export "__collect" (func $~lib/rt/stub/__collect))
 (export "__rtti_base" (global $~lib/rt/__rtti_base))
 (export "memory" (memory $0))
 (export "_start" (func $~start))
 (func $~lib/rt/stub/__new (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  local.get $0
  i32.const 1073741804
  i32.gt_u
  if
   i32.const 1056
   i32.const 1120
   i32.const 86
   i32.const 30
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.const 16
  i32.add
  local.tee $4
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 1056
   i32.const 1120
   i32.const 33
   i32.const 29
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/stub/offset
  local.tee $3
  i32.const 4
  i32.add
  local.tee $2
  local.get $4
  i32.const 19
  i32.add
  i32.const -16
  i32.and
  i32.const 4
  i32.sub
  local.tee $4
  i32.add
  local.tee $5
  memory.size $0
  local.tee $6
  i32.const 16
  i32.shl
  i32.const 15
  i32.add
  i32.const -16
  i32.and
  local.tee $7
  i32.gt_u
  if
   local.get $6
   local.get $5
   local.get $7
   i32.sub
   i32.const 65535
   i32.add
   i32.const -65536
   i32.and
   i32.const 16
   i32.shr_u
   local.tee $7
   local.get $6
   local.get $7
   i32.gt_s
   select
   memory.grow $0
   i32.const 0
   i32.lt_s
   if
    local.get $7
    memory.grow $0
    i32.const 0
    i32.lt_s
    if
     unreachable
    end
   end
  end
  local.get $5
  global.set $~lib/rt/stub/offset
  local.get $3
  local.get $4
  i32.store $0
  local.get $2
  i32.const 4
  i32.sub
  local.tee $3
  i32.const 0
  i32.store $0 offset=4
  local.get $3
  i32.const 0
  i32.store $0 offset=8
  local.get $3
  local.get $1
  i32.store $0 offset=12
  local.get $3
  local.get $0
  i32.store $0 offset=16
  local.get $2
  i32.const 16
  i32.add
 )
 (func $assembly/aldea/coin/Coin#constructor (param $0 i64) (result i32)
  (local $1 i32)
  i32.const 8
  i32.const 3
  call $~lib/rt/stub/__new
  local.tee $1
  i64.const 0
  i64.store $0
  local.get $1
  i32.eqz
  if
   i32.const 0
   i32.const 4
   call $~lib/rt/stub/__new
   local.set $1
  end
  local.get $1
  local.get $0
  i64.store $0
  local.get $1
  i32.const 1184
  call $~lib/aldea/imports/vm_constructor
  local.get $1
 )
 (func $assembly/aldea/coin/Coin_constructor (param $0 i64) (result i32)
  local.get $0
  call $assembly/aldea/coin/Coin#constructor
 )
 (func $~lib/arraybuffer/ArrayBuffer#constructor (param $0 i32) (result i32)
  (local $1 i32)
  local.get $0
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 1392
   i32.const 1440
   i32.const 52
   i32.const 43
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.const 0
  call $~lib/rt/stub/__new
  local.tee $1
  i32.const 0
  local.get $0
  memory.fill $0
  local.get $1
 )
 (func $~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#set (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  local.get $0
  i32.load $0
  local.get $1
  local.tee $3
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $1
  local.get $1
  i32.const 15
  i32.shr_u
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $1
  local.get $1
  i32.const 13
  i32.shr_u
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $1
  local.get $1
  i32.const 16
  i32.shr_u
  i32.xor
  local.tee $8
  local.get $0
  i32.load $0 offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load $0
  local.set $1
  block $__inlined_func$~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#find
   loop $while-continue|0
    local.get $1
    if
     local.get $1
     i32.load $0 offset=8
     local.tee $4
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $1
      i32.load $0
      local.get $3
      i32.eq
     end
     br_if $__inlined_func$~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#find
     local.get $4
     i32.const -2
     i32.and
     local.set $1
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $1
  end
  local.get $1
  if
   local.get $1
   local.get $2
   i32.store $0 offset=4
  else
   local.get $0
   i32.load $0 offset=16
   local.get $0
   i32.load $0 offset=12
   i32.eq
   if
    local.get $0
    i32.load $0 offset=20
    local.get $0
    i32.load $0 offset=12
    i32.const 3
    i32.mul
    i32.const 4
    i32.div_s
    i32.lt_s
    if (result i32)
     local.get $0
     i32.load $0 offset=4
    else
     local.get $0
     i32.load $0 offset=4
     i32.const 1
     i32.shl
     i32.const 1
     i32.or
    end
    local.tee $6
    i32.const 1
    i32.add
    local.tee $1
    i32.const 2
    i32.shl
    call $~lib/arraybuffer/ArrayBuffer#constructor
    local.set $7
    local.get $1
    i32.const 3
    i32.shl
    i32.const 3
    i32.div_s
    local.tee $9
    i32.const 12
    i32.mul
    call $~lib/arraybuffer/ArrayBuffer#constructor
    local.set $4
    local.get $0
    i32.load $0 offset=8
    local.tee $5
    local.get $0
    i32.load $0 offset=16
    i32.const 12
    i32.mul
    i32.add
    local.set $10
    local.get $4
    local.set $1
    loop $while-continue|00
     local.get $5
     local.get $10
     i32.ne
     if
      local.get $5
      i32.load $0 offset=8
      i32.const 1
      i32.and
      i32.eqz
      if
       local.get $1
       local.get $5
       i32.load $0
       local.tee $11
       i32.store $0
       local.get $1
       local.get $5
       i32.load $0 offset=4
       i32.store $0 offset=4
       local.get $1
       local.get $7
       local.get $11
       i32.const -1028477379
       i32.mul
       i32.const 374761397
       i32.add
       i32.const 17
       i32.rotl
       i32.const 668265263
       i32.mul
       local.tee $11
       i32.const 15
       i32.shr_u
       local.get $11
       i32.xor
       i32.const -2048144777
       i32.mul
       local.tee $11
       i32.const 13
       i32.shr_u
       local.get $11
       i32.xor
       i32.const -1028477379
       i32.mul
       local.tee $11
       i32.const 16
       i32.shr_u
       local.get $11
       i32.xor
       local.get $6
       i32.and
       i32.const 2
       i32.shl
       i32.add
       local.tee $11
       i32.load $0
       i32.store $0 offset=8
       local.get $11
       local.get $1
       i32.store $0
       local.get $1
       i32.const 12
       i32.add
       local.set $1
      end
      local.get $5
      i32.const 12
      i32.add
      local.set $5
      br $while-continue|00
     end
    end
    local.get $0
    local.get $7
    i32.store $0
    local.get $0
    local.get $6
    i32.store $0 offset=4
    local.get $0
    local.get $4
    i32.store $0 offset=8
    local.get $0
    local.get $9
    i32.store $0 offset=12
    local.get $0
    local.get $0
    i32.load $0 offset=20
    i32.store $0 offset=16
   end
   local.get $0
   i32.load $0 offset=8
   local.set $1
   local.get $0
   local.get $0
   i32.load $0 offset=16
   local.tee $4
   i32.const 1
   i32.add
   i32.store $0 offset=16
   local.get $1
   local.get $4
   i32.const 12
   i32.mul
   i32.add
   local.tee $1
   local.get $3
   i32.store $0
   local.get $1
   local.get $2
   i32.store $0 offset=4
   local.get $0
   local.get $0
   i32.load $0 offset=20
   i32.const 1
   i32.add
   i32.store $0 offset=20
   local.get $1
   local.get $0
   i32.load $0
   local.get $8
   local.get $0
   i32.load $0 offset=4
   i32.and
   i32.const 2
   i32.shl
   i32.add
   local.tee $0
   i32.load $0
   i32.store $0 offset=8
   local.get $0
   local.get $1
   i32.store $0
  end
 )
 (func $~lib/aldea/jig/cacheState (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  local.get $0
  if (result i32)
   block $__inlined_func$~lib/rt/__instanceof (result i32)
    local.get $0
    i32.const 20
    i32.sub
    i32.load $0 offset=12
    local.tee $1
    i32.const 2016
    i32.load $0
    i32.le_u
    if
     loop $do-loop|0
      i32.const 1
      local.get $1
      i32.const 11
      i32.eq
      br_if $__inlined_func$~lib/rt/__instanceof
      drop
      local.get $1
      i32.const 3
      i32.shl
      i32.const 2020
      i32.add
      i32.load $0 offset=4
      local.tee $1
      br_if $do-loop|0
     end
    end
    i32.const 0
   end
  else
   i32.const 0
  end
  if (result i32)
   block $__inlined_func$~lib/rt/__instanceof0 (result i32)
    local.get $0
    i32.const 20
    i32.sub
    i32.load $0 offset=12
    local.tee $1
    i32.const 2016
    i32.load $0
    i32.le_u
    if
     loop $do-loop|02
      i32.const 1
      local.get $1
      i32.const 11
      i32.eq
      br_if $__inlined_func$~lib/rt/__instanceof0
      drop
      local.get $1
      i32.const 3
      i32.shl
      i32.const 2020
      i32.add
      i32.load $0 offset=4
      local.tee $1
      br_if $do-loop|02
     end
    end
    i32.const 0
   end
   i32.eqz
   if
    i32.const 1504
    i32.const 1568
    i32.const 43
    i32.const 18
    call $~lib/builtins/abort
    unreachable
   end
   local.get $0
   i32.load $0
   call $~lib/aldea/imports/vm_remote_state
  else
   local.get $0
   call $~lib/aldea/imports/vm_local_state
  end
  local.set $1
  global.get $~lib/aldea/jig/LOCK_CACHE
  local.set $3
  local.get $1
  i32.load $0 offset=16
  local.set $4
  i32.const 12
  i32.const 5
  call $~lib/rt/stub/__new
  local.tee $2
  i32.const 0
  i32.store $0
  local.get $2
  i32.const 0
  i32.store $0 offset=4
  local.get $2
  i32.const 0
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store $0 offset=8
  local.get $2
  local.get $0
  i32.store $0
  local.get $4
  if
   local.get $2
   local.get $4
   i32.load $0
   i32.store $0 offset=4
   local.get $2
   local.get $4
   i32.load $0 offset=4
   i32.store $0 offset=8
  end
  local.get $3
  local.get $0
  local.get $2
  call $~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#set
  global.get $~lib/aldea/jig/OUTPUT_CACHE
  local.set $2
  i32.const 24
  i32.const 8
  call $~lib/rt/stub/__new
  local.tee $3
  i32.const 0
  i32.store $0
  local.get $3
  i32.const 0
  i32.store $0 offset=4
  local.get $3
  i32.const 0
  i32.store $0 offset=8
  local.get $3
  i64.const 0
  i64.store $0 offset=16
  local.get $3
  local.get $0
  i32.store $0
  local.get $3
  local.get $1
  i32.load $0
  i32.store $0 offset=4
  local.get $3
  local.get $1
  i32.load $0 offset=4
  i32.store $0 offset=8
  local.get $3
  local.get $1
  i64.load $0 offset=8
  i64.store $0 offset=16
  local.get $2
  local.get $0
  local.get $3
  call $~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#set
 )
 (func $~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#get (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  local.get $0
  i32.load $0
  local.get $0
  i32.load $0 offset=4
  local.get $1
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $0
  i32.const 15
  i32.shr_u
  local.get $0
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $0
  i32.const 13
  i32.shr_u
  local.get $0
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $0
  i32.const 16
  i32.shr_u
  local.get $0
  i32.xor
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load $0
  local.set $0
  block $__inlined_func$~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#find
   loop $while-continue|0
    local.get $0
    if
     local.get $0
     i32.load $0 offset=8
     local.tee $2
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $0
      i32.load $0
      local.get $1
      i32.eq
     end
     br_if $__inlined_func$~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#find
     local.get $2
     i32.const -2
     i32.and
     local.set $0
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $0
  end
  local.get $0
  i32.eqz
  if
   i32.const 1632
   i32.const 1696
   i32.const 105
   i32.const 17
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load $0 offset=4
 )
 (func $~lib/aldea/lock/Lock#to (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  local.get $0
  i32.load $0
  local.tee $3
  if (result i32)
   block $__inlined_func$~lib/rt/__instanceof (result i32)
    local.get $3
    i32.const 20
    i32.sub
    i32.load $0 offset=12
    local.tee $3
    i32.const 2016
    i32.load $0
    i32.le_u
    if
     loop $do-loop|0
      i32.const 1
      local.get $3
      i32.const 11
      i32.eq
      br_if $__inlined_func$~lib/rt/__instanceof
      drop
      local.get $3
      i32.const 3
      i32.shl
      i32.const 2020
      i32.add
      i32.load $0 offset=4
      local.tee $3
      br_if $do-loop|0
     end
    end
    i32.const 0
   end
  else
   i32.const 0
  end
  if
   block $__inlined_func$~lib/rt/__instanceof0 (result i32)
    local.get $0
    i32.load $0
    local.tee $4
    i32.const 20
    i32.sub
    i32.load $0 offset=12
    local.tee $3
    i32.const 2016
    i32.load $0
    i32.le_u
    if
     loop $do-loop|02
      i32.const 1
      local.get $3
      i32.const 11
      i32.eq
      br_if $__inlined_func$~lib/rt/__instanceof0
      drop
      local.get $3
      i32.const 3
      i32.shl
      i32.const 2020
      i32.add
      i32.load $0 offset=4
      local.tee $3
      br_if $do-loop|02
     end
    end
    i32.const 0
   end
   i32.eqz
   if
    i32.const 1504
    i32.const 1856
    i32.const 51
    i32.const 20
    call $~lib/builtins/abort
    unreachable
   end
   local.get $4
   i32.load $0
   local.get $1
   local.get $2
   call $~lib/aldea/imports/vm_remote_lock
  else
   local.get $0
   i32.load $0
   local.get $1
   local.get $2
   call $~lib/aldea/imports/vm_local_lock
  end
  local.get $0
  local.get $1
  i32.store $0 offset=4
  local.get $0
  local.get $2
  i32.store $0 offset=8
 )
 (func $assembly/aldea/coin/Coin$send (param $0 i32) (param $1 i64) (param $2 i32) (result i32)
  (local $3 i32)
  (local $4 i32)
  local.get $0
  i32.const 1216
  call $~lib/aldea/imports/vm_local_call_start
  local.get $0
  i64.load $0
  local.get $1
  i64.lt_u
  if
   i32.const 1264
   i32.const 1328
   i32.const 11
   i32.const 7
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  local.get $0
  i64.load $0
  local.get $1
  i64.sub
  i64.store $0
  local.get $1
  call $assembly/aldea/coin/Coin#constructor
  local.set $3
  global.get $~lib/aldea/jig/LOCK_CACHE
  local.tee $0
  i32.load $0
  local.get $0
  i32.load $0 offset=4
  local.get $3
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $0
  local.get $0
  i32.const 15
  i32.shr_u
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $0
  local.get $0
  i32.const 13
  i32.shr_u
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $0
  local.get $0
  i32.const 16
  i32.shr_u
  i32.xor
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load $0
  local.set $0
  block $__inlined_func$~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#find
   loop $while-continue|0
    local.get $0
    if
     local.get $0
     i32.load $0 offset=8
     local.tee $4
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $0
      i32.load $0
      local.get $3
      i32.eq
     end
     br_if $__inlined_func$~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#find
     local.get $4
     i32.const -2
     i32.and
     local.set $0
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $0
  end
  local.get $0
  i32.eqz
  if
   local.get $3
   call $~lib/aldea/jig/cacheState
  end
  global.get $~lib/aldea/jig/LOCK_CACHE
  local.get $3
  call $~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#get
  local.set $0
  local.get $2
  i32.const 20
  i32.sub
  i32.load $0 offset=16
  i32.const 20
  i32.ne
  if
   i32.const 1744
   i32.const 1856
   i32.const 63
   i32.const 7
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.const 1
  local.get $2
  call $~lib/aldea/lock/Lock#to
  call $~lib/aldea/imports/vm_local_call_end
  local.get $3
 )
 (func $assembly/aldea/coin/Coin#_merge~anonymous|0 (param $0 i64) (param $1 i32) (param $2 i32) (param $3 i32) (result i64)
  local.get $0
  local.get $1
  i64.load $0
  i64.add
 )
 (func $assembly/aldea/coin/Coin#_merge~anonymous|1 (param $0 i32) (param $1 i32) (param $2 i32)
  local.get $0
  i64.const 0
  i64.store $0
  global.get $~lib/aldea/jig/OUTPUT_CACHE
  local.tee $1
  i32.load $0
  local.get $1
  i32.load $0 offset=4
  local.get $0
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $1
  local.get $1
  i32.const 15
  i32.shr_u
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $1
  local.get $1
  i32.const 13
  i32.shr_u
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $1
  local.get $1
  i32.const 16
  i32.shr_u
  i32.xor
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load $0
  local.set $1
  block $__inlined_func$~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#find
   loop $while-continue|0
    local.get $1
    if
     local.get $1
     i32.load $0 offset=8
     local.tee $2
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $1
      i32.load $0
      local.get $0
      i32.eq
     end
     br_if $__inlined_func$~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#find
     local.get $2
     i32.const -2
     i32.and
     local.set $1
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $1
  end
  local.get $1
  i32.eqz
  if
   local.get $0
   call $~lib/aldea/jig/cacheState
  end
  global.get $~lib/aldea/jig/OUTPUT_CACHE
  local.get $0
  call $~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#get
  i32.load $0
  local.set $1
  global.get $~lib/aldea/jig/LOCK_CACHE
  local.tee $0
  i32.load $0
  local.get $0
  i32.load $0 offset=4
  local.get $1
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $0
  local.get $0
  i32.const 15
  i32.shr_u
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $0
  local.get $0
  i32.const 13
  i32.shr_u
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $0
  local.get $0
  i32.const 16
  i32.shr_u
  i32.xor
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load $0
  local.set $0
  block $__inlined_func$~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#find1
   loop $while-continue|02
    local.get $0
    if
     local.get $0
     i32.load $0 offset=8
     local.tee $2
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $0
      i32.load $0
      local.get $1
      i32.eq
     end
     br_if $__inlined_func$~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#find1
     local.get $2
     i32.const -2
     i32.and
     local.set $0
     br $while-continue|02
    end
   end
   i32.const 0
   local.set $0
  end
  local.get $0
  i32.eqz
  if
   local.get $1
   call $~lib/aldea/jig/cacheState
  end
  global.get $~lib/aldea/jig/LOCK_CACHE
  local.get $1
  call $~lib/map/Map<~lib/aldea/jig/Jig,~lib/aldea/lock/Lock>#get
  i32.const -1
  i32.const 0
  call $~lib/arraybuffer/ArrayBuffer#constructor
  call $~lib/aldea/lock/Lock#to
 )
 (func $assembly/aldea/coin/Coin$merge (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i64)
  (local $5 i64)
  (local $6 i32)
  (local $7 i32)
  local.get $0
  i32.const 1920
  call $~lib/aldea/imports/vm_local_call_start
  local.get $0
  i64.load $0
  local.set $5
  local.get $1
  i32.load $0 offset=12
  local.set $6
  loop $for-loop|0
   local.get $2
   local.get $6
   local.get $1
   i32.load $0 offset=12
   local.tee $7
   local.get $6
   local.get $7
   i32.lt_s
   select
   i32.lt_s
   if
    local.get $4
    local.get $1
    i32.load $0 offset=4
    local.get $2
    i32.const 2
    i32.shl
    i32.add
    i32.load $0
    local.get $2
    local.get $1
    i32.const 1968
    i32.load $0
    call_indirect $0 (type $i64_i32_i32_i32_=>_i64)
    local.set $4
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  local.get $0
  local.get $4
  local.get $5
  i64.add
  i64.store $0
  local.get $1
  i32.load $0 offset=12
  local.set $2
  loop $for-loop|01
   local.get $3
   local.get $2
   local.get $1
   i32.load $0 offset=12
   local.tee $6
   local.get $2
   local.get $6
   i32.lt_s
   select
   i32.lt_s
   if
    local.get $1
    i32.load $0 offset=4
    local.get $3
    i32.const 2
    i32.shl
    i32.add
    i32.load $0
    local.get $3
    local.get $1
    i32.const 2000
    i32.load $0
    call_indirect $0 (type $i32_i32_i32_=>_none)
    local.get $3
    i32.const 1
    i32.add
    local.set $3
    br $for-loop|01
   end
  end
  call $~lib/aldea/imports/vm_local_call_end
  local.get $0
 )
 (func $~lib/rt/stub/__pin (param $0 i32) (result i32)
  local.get $0
 )
 (func $~lib/rt/stub/__unpin (param $0 i32)
  nop
 )
 (func $~lib/rt/stub/__collect
  nop
 )
 (func $~start
  (local $0 i32)
  global.get $~started
  if
   return
  end
  i32.const 1
  global.set $~started
  i32.const 2140
  global.set $~lib/rt/stub/offset
  i32.const 24
  i32.const 7
  call $~lib/rt/stub/__new
  local.tee $0
  i32.const 16
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store $0
  local.get $0
  i32.const 3
  i32.store $0 offset=4
  local.get $0
  i32.const 48
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store $0 offset=8
  local.get $0
  i32.const 4
  i32.store $0 offset=12
  local.get $0
  i32.const 0
  i32.store $0 offset=16
  local.get $0
  i32.const 0
  i32.store $0 offset=20
  local.get $0
  global.set $~lib/aldea/jig/LOCK_CACHE
  i32.const 24
  i32.const 10
  call $~lib/rt/stub/__new
  local.tee $0
  i32.const 16
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store $0
  local.get $0
  i32.const 3
  i32.store $0 offset=4
  local.get $0
  i32.const 48
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store $0 offset=8
  local.get $0
  i32.const 4
  i32.store $0 offset=12
  local.get $0
  i32.const 0
  i32.store $0 offset=16
  local.get $0
  i32.const 0
  i32.store $0 offset=20
  local.get $0
  global.set $~lib/aldea/jig/OUTPUT_CACHE
 )
)
