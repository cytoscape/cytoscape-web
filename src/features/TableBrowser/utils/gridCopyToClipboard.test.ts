// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import { gridCopyToClipboard } from './gridCopyToClipboard'

// Like the browser's Clipboard, the methods live on the prototype, so the
// tests can check the wrapper leaves the instance exactly as it found it.
class FakeClipboard {
  writeResult: Promise<void> = Promise.resolve()
  write(_data: unknown): Promise<void> {
    return this.writeResult
  }
  writeText(_text: string): Promise<void> {
    return this.writeResult
  }
}

const stubClipboard = (clipboard: unknown): void => {
  vi.stubGlobal('navigator', { clipboard })
}

describe('gridCopyToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves true when the write the grid starts succeeds', async () => {
    const clipboard = new FakeClipboard()
    stubClipboard(clipboard)
    const copy = vi.fn(async () => {
      // The grid fires the write without awaiting it.
      void navigator.clipboard.write([])
    })

    await expect(gridCopyToClipboard(copy)).resolves.toBe(true)
    expect(copy).toHaveBeenCalledOnce()
  })

  it('resolves false when the clipboard is unavailable (insecure context)', async () => {
    stubClipboard(undefined)
    const copy = vi.fn(async () => undefined)

    await expect(gridCopyToClipboard(copy)).resolves.toBe(false)
    expect(copy).not.toHaveBeenCalled()
  })

  it('resolves false when the grid fires write() and it is refused', async () => {
    const clipboard = new FakeClipboard()
    clipboard.writeResult = Promise.reject(new Error('NotAllowedError'))
    stubClipboard(clipboard)

    await expect(
      gridCopyToClipboard(async () => {
        void navigator.clipboard.write([])
      }),
    ).resolves.toBe(false)
  })

  it('resolves false when the grid falls back to writeText() and it is refused', async () => {
    const clipboard = new FakeClipboard()
    clipboard.writeResult = Promise.reject(new Error('NotAllowedError'))
    stubClipboard(clipboard)

    await expect(
      gridCopyToClipboard(async () => {
        void navigator.clipboard.writeText('a\tb')
      }),
    ).resolves.toBe(false)
  })

  it('resolves true when the grid writes nothing (nothing to copy)', async () => {
    stubClipboard(new FakeClipboard())

    await expect(gridCopyToClipboard(async () => undefined)).resolves.toBe(true)
  })

  it('resolves false instead of rejecting when the grid copy throws', async () => {
    stubClipboard(new FakeClipboard())

    await expect(
      gridCopyToClipboard(async () => {
        throw new Error('boom')
      }),
    ).resolves.toBe(false)
  })

  it('restores the clipboard methods afterwards, even on failure', async () => {
    const clipboard = new FakeClipboard()
    stubClipboard(clipboard)

    await gridCopyToClipboard(async () => {
      throw new Error('boom')
    })

    expect(Object.prototype.hasOwnProperty.call(clipboard, 'write')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(clipboard, 'writeText')).toBe(
      false,
    )
    expect(clipboard.write).toBe(FakeClipboard.prototype.write)
    expect(clipboard.writeText).toBe(FakeClipboard.prototype.writeText)
  })
})
