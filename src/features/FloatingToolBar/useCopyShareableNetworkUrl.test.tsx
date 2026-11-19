/**
 * The share button reports a copied URL only when the clipboard write worked:
 * no false success without a clipboard (plain http), and an error message
 * instead of an unhandled rejection when the browser refuses the write.
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { MessageSeverity } from '@/models/MessageModel'
import type { MessageSeverityType } from '@/models/MessageModel/Message'

import { useCopyShareableNetworkUrl } from './useCopyShareableNetworkUrl'

vi.mock('@/data/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/db')>()
  const mocked: Record<string, unknown> = { ...actual }
  for (const key of Object.keys(actual)) {
    if (
      key.startsWith('put') ||
      key.startsWith('delete') ||
      key.startsWith('clear')
    ) {
      mocked[key] = vi.fn().mockResolvedValue(undefined)
    }
  }
  return mocked
})

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(MemoryRouter, null, children)

// `undefined` removes the property, as in an insecure context, where
// `'clipboard' in navigator` is false.
const stubClipboard = (clipboard: unknown): void => {
  if (clipboard === undefined) {
    delete (navigator as { clipboard?: unknown }).clipboard
    return
  }
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
  })
}

const severities = (): (MessageSeverityType | undefined)[] =>
  useMessageStore.getState().messages.map((m) => m.severity)

const copyUrl = (): void => {
  const { result } = renderHook(() => useCopyShareableNetworkUrl(), {
    wrapper,
  })
  act(() => {
    result.current()
  })
}

describe('useCopyShareableNetworkUrl clipboard feedback', () => {
  beforeEach(() => {
    act(() => {
      useMessageStore.getState().resetMessages()
      useWorkspaceStore.getState().setCurrentNetworkId('share-net')
    })
  })

  afterEach(() => {
    stubClipboard(undefined)
  })

  it('reports success once the URL is written', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard({ writeText })

    copyUrl()

    await waitFor(() => expect(severities()).toEqual([MessageSeverity.SUCCESS]))
    expect(writeText.mock.calls[0][0]).toContain('/0/networks/share-net')
  })

  it('reports an error, not success, without a clipboard', async () => {
    stubClipboard(undefined)

    copyUrl()

    await waitFor(() => expect(severities()).toEqual([MessageSeverity.ERROR]))
  })

  it('reports an error when the browser refuses the write', async () => {
    stubClipboard({
      writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
    })

    copyUrl()

    await waitFor(() => expect(severities()).toEqual([MessageSeverity.ERROR]))
  })
})
