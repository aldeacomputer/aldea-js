import {BCS, blake3} from "@aldea/core";

/**
 * Helper function to calculate the id of a package.
 *
 * @param {string[]} entryPoints - The array of entry point strings.
 * @param {Map<string, string>} sources - The map of source files.
 * @return {Uint8Array} The calculated package hash as a Uint8Array.
 */
export function calculatePackageHash (entryPoints: string[], sources: Map<string, string>): Uint8Array {
  const data = BCS.pkg.encode([entryPoints.sort(), sources])
  return blake3.hash(data)
}
