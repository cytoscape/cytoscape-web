// src/app-api/useContextMenuApi.test.ts
// Trivial hook test — verifies the hook returns the core contextMenuApi object.

import { renderHook } from '@testing-library/react'

import { contextMenuApi } from './core/contextMenuApi'
import { useContextMenuApi } from './useContextMenuApi'

jest.mock('./core/contextMenuApi', () => ({
  contextMenuApi: {
    addContextMenuItem: jest.fn(),
    removeContextMenuItem: jest.fn(),
  },
}))

it('returns the core contextMenuApi object', () => {
  const { result } = renderHook(() => useContextMenuApi())
  expect(result.current).toBe(contextMenuApi)
})
