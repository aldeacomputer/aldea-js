import {BCS, blake3} from "@aldea/sdk-js";

export function calculatePackageId (entryPoints: string[], sources: Map<string, string>): Uint8Array {
  const data = BCS.pkg.encode([entryPoints.sort(), sources])
  return blake3.hash(data)
}
