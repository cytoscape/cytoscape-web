// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyToClipboard } from './copyToClipboard'

const stubClipboard = (clipboard: unknown): void => {
  vi.stubGlobal('navigator', { clipboard })
}

describe('copyToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves true once the text is written', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard({ writeText })

    await expect(copyToClipboard('hello')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('resolves false when the clipboard is unavailable (insecure context)', async () => {
    stubClipboard(undefined)

    await expect(copyToClipboard('hello')).resolves.toBe(false)
  })

  it('resolves false instead of rejecting when the write is refused', async () => {
    stubClipboard({
      writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
    })

    await expect(copyToClipboard('hello')).resolves.toBe(false)
  })
})
