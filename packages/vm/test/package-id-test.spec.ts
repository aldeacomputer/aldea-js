import {expect} from "chai";
import {calculatePackageHash} from "../src/index.js";

describe('calculatePackageId', function () {
  const file1 = `
    export class Thing extends Jig {}
  `

  const file2 = `
    export class Another extends Jig {}
  `

  it('returns different values for different files', () => {
    const entries = ['source.ts']
    const sources1 = new Map()
    sources1.set(entries[0], file1)

    const sources2 = new Map()
    sources2.set(entries[0], file2)
    expect(calculatePackageHash(entries, sources1)).not.to.eql(calculatePackageHash(entries, sources2))
  })

  it('returns different values for different entry points', () => {
    const entries1 = ['source1.ts']
    const entries2 = ['source2.ts']
    const sources = new Map()
    sources.set(entries1[0], file1)
    sources.set(entries2[0], file1)

    expect(calculatePackageHash(entries1, sources)).not.to.eql(calculatePackageHash(entries2, sources))
  })

  it('is not affected by entries order', () => {
    const entries1 = ['source1.ts', 'source2.ts']
    const entries2 = ['source2.ts', 'source1.ts']
    const sources = new Map()
    sources.set(entries1[0], file1)
    sources.set(entries1[1], file1)

    expect(calculatePackageHash(entries1, sources)).to.eql(calculatePackageHash(entries2, sources))
  })

  it('is not affected by source code adition order', () => {
    const entries = ['source1.ts', 'source2.ts']
    const sources1 = new Map()
    sources1.set(entries[0], file1)
    sources1.set(entries[1], file1)

    const sources2 = new Map()
    sources2.set(entries[1], file1)
    sources2.set(entries[0], file1)

    expect(calculatePackageHash(entries, sources1)).to.eql(calculatePackageHash(entries, sources2))
  })
});
