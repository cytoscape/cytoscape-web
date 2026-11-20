/**
 * `?activeNetworkViewTab=` is applied only when it is a whole, non-negative
 * tab index (#995). Anything else keeps the first tab.
 */
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'

import type { AppShellBootContext } from './appShellBootContext'
import { restoreUrlState } from './restoreUrlState'

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

const restoreTab = (value: string): void => {
  const ctx = {
    search: new URLSearchParams({ activeNetworkViewTab: value }),
  } as AppShellBootContext
  restoreUrlState(ctx, 'tab-net')
}

const tabIndex = (): number =>
  useUiStateStore.getState().ui.networkViewUi.activeTabIndex

describe('restoreUrlState activeNetworkViewTab (#995)', () => {
  beforeEach(() => {
    act(() => {
      useUiStateStore.getState().setNetworkViewTabIndex(0)
    })
  })

  it('applies a whole tab index', () => {
    restoreTab('1')

    expect(tabIndex()).toBe(1)
  })

  it.each(['1.5', '-1', 'abc', ''])('ignores %j', (value) => {
    restoreTab(value)

    expect(tabIndex()).toBe(0)
  })
})
