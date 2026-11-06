import { readFileSync } from 'fs'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { cx2TooLargeMessage } from './cx2TooLargeMessage'

// 20 nodes and 30 edges, listed in its metaData.
const FIXTURE = path.resolve(
  __dirname,
  '../../../test/fixtures/cx2/valid/small-network.valid.cx2',
)
const fixtureFile = (): File =>
  new File([readFileSync(FIXTURE)], 'small-network.cx2')

// The fixture re-encoded as UTF-16LE with a byte-order mark, as Windows
// PowerShell 5 writes it.
const utf16FixtureFile = (): File => {
  const text = readFileSync(FIXTURE, 'utf8')
  const bytes = new Uint8Array(2 + text.length * 2)
  bytes.set([0xff, 0xfe])
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    bytes[2 + i * 2] = code & 0xff
    bytes[3 + i * 2] = code >> 8
  }
  return new File([bytes], 'small-network.cx2')
}

const LIMITS = {
  maxEdgeCountThreshold: 10,
  maxNetworkElementsThreshold: 40,
  maxNetworkFileSize: 1024,
}

describe('cx2TooLargeMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('gives no message for a network within the limits', async () => {
    const limits = { ...LIMITS, maxEdgeCountThreshold: 30 }
    expect(await cx2TooLargeMessage(fixtureFile(), limits)).toBeUndefined()
  })

  it('gives the counts and the limits for a network over them', async () => {
    expect(await cx2TooLargeMessage(fixtureFile(), LIMITS)).toBe(
      'small-network.cx2 is too large to be loaded into Cytoscape Web: ' +
        'it has 20 nodes and 30 edges. A network opens if it has at most 10 ' +
        'edges, or fewer than 40 nodes and edges combined in a file under ' +
        '1 KiB.',
    )
  })

  it('gives the file size for a file that lists no counts', async () => {
    const file = new File(['x'.repeat(2048)], 'no-counts.cx2')
    expect(await cx2TooLargeMessage(file, LIMITS)).toBe(
      'no-counts.cx2 is too large to be loaded into Cytoscape Web: ' +
        'it is 2 KiB and does not list its node and edge counts, so it must ' +
        'be under 1 KiB.',
    )
  })

  it('reads the counts of a UTF-16 file with a byte-order mark', async () => {
    expect(await cx2TooLargeMessage(utf16FixtureFile(), LIMITS)).toMatch(
      /it has 20 nodes and 30 edges/,
    )
  })

  it('checks the size only when the start of the file cannot be read', async () => {
    vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (
      this: FileReader,
    ) {
      setTimeout(() => this.dispatchEvent(new ProgressEvent('error')))
    })
    const unreadable = (size: number): File =>
      new File(['x'.repeat(size)], 'unreadable.cx2')

    expect(await cx2TooLargeMessage(unreadable(100), LIMITS)).toBeUndefined()
    expect(await cx2TooLargeMessage(unreadable(2048), LIMITS)).toMatch(
      /does not list its node and edge counts/,
    )
  })
})
