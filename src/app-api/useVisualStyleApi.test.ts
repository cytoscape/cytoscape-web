// src/app-api/useVisualStyleApi.test.ts

import { renderHook } from '@testing-library/react'

import { visualStyleApi } from './core/visualStyleApi'
import { useVisualStyleApi } from './useVisualStyleApi'

it('returns the core visualStyleApi object', () => {
  const { result } = renderHook(() => useVisualStyleApi())
  expect(result.current).toBe(visualStyleApi)
})
