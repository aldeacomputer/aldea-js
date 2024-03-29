import { BCS } from './internal.js'
import { Abi } from './abi/types.js'
import { validateAbi } from './abi/validations.js'

/**
 * Parses the given binary data to an ABI interface.
 */
export function abiFromBin(data: Uint8Array): Abi {
  const bcs = new BCS({ addAbiTypes: true })
  const abi = bcs.decode('abi', data)

  if (validateAbi(abi)) {
    return abi
  } else {
    throw new Error('invalid abi binary data')
  }
}

/**
 * Parses the given JSON data to an ABI interface.
 */
export function abiFromJson(json: string): Abi {
  const abi = JSON.parse(json)
  if (validateAbi(abi)) {
    return abi
  } else {
    throw new Error('invalid abi json string')
  }
}

/**
 * Serializes the given ABI interface to binary data.
 */
export function abiToBin(abi: Abi): Uint8Array {
  const bcs = new BCS({ addAbiTypes: true })
  return bcs.encode('abi', abi)
}

/**
 * Serializes the given ABI interface to JSON data.
 */
export function abiToJson(abi: Abi, space: number = 0): string {
  const isImport = (val: any): boolean => {
    return typeof val.kind === 'number' && typeof val.pkg === 'string'
  }

  return JSON.stringify(abi, function(key, val) {
    if (key === 'node' || key === 'source' || (key === 'code' && isImport(this))) {
      return undefined
    } else {
      return val
    }
  }, space)
}
