// src/app-api/useTableApi.test.ts

import { renderHook } from '@testing-library/react'

import { tableApi } from './core/tableApi'
import { useTableApi } from './useTableApi'

it('returns the core tableApi object', () => {
  const { result } = renderHook(() => useTableApi())
  expect(result.current).toBe(tableApi)
})
