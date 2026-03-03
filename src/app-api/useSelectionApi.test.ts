// src/app-api/useSelectionApi.test.ts

import { renderHook } from '@testing-library/react'

import { selectionApi } from './core/selectionApi'
import { useSelectionApi } from './useSelectionApi'

it('returns the core selectionApi object', () => {
  const { result } = renderHook(() => useSelectionApi())
  expect(result.current).toBe(selectionApi)
})
