import {blake3} from "@aldea/sdk-js/support/hash";
import {base16} from "@aldea/sdk-js";

export function calculatePackageId (entryPoints: string[], sources: Map<string, string>): string {
  const data = [
    ...entryPoints.sort(),
    ...Array.from(sources.entries())
      .sort((entryA, entryB) => entryA[0].localeCompare(entryB[0]))
      .flat()
  ]
  return base16.encode(blake3(new Uint8Array(Buffer.from(data.join('')))))
}
