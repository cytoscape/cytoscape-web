// src/app-api/useExportApi.test.ts

import { renderHook } from '@testing-library/react'

import { exportApi } from './core/exportApi'
import { useExportApi } from './useExportApi'

it('returns the core exportApi object', () => {
  const { result } = renderHook(() => useExportApi())
  expect(result.current).toBe(exportApi)
})
