// src/app-api/useViewportApi.test.ts

import { renderHook } from '@testing-library/react'

import { viewportApi } from './core/viewportApi'
import { useViewportApi } from './useViewportApi'

it('returns the core viewportApi object', () => {
  const { result } = renderHook(() => useViewportApi())
  expect(result.current).toBe(viewportApi)
})
