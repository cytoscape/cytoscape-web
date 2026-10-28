// @vitest-environment node
import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { cx2TooLargeMessage } from './cx2TooLargeMessage'

// 20 nodes and 30 edges, listed in its metaData.
const FIXTURE = path.resolve(
  __dirname,
  '../../../test/fixtures/cx2/valid/small-network.valid.cx2',
)
const fixtureFile = (): File =>
  new File([readFileSync(FIXTURE)], 'small-network.cx2')

const LIMITS = {
  maxEdgeCountThreshold: 10,
  maxNetworkElementsThreshold: 40,
  maxNetworkFileSize: 1024,
}

describe('cx2TooLargeMessage', () => {
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

  it('checks the size only when the start of the file cannot be read', async () => {
    const unreadable = (size: number): File =>
      ({
        name: 'unreadable.cx2',
        size,
        slice: () => ({
          text: () => Promise.reject(new Error('NotReadableError')),
        }),
      }) as unknown as File

    expect(await cx2TooLargeMessage(unreadable(100), LIMITS)).toBeUndefined()
    expect(await cx2TooLargeMessage(unreadable(2048), LIMITS)).toMatch(
      /does not list its node and edge counts/,
    )
  })
})
