// src/app-api/useExportApi.test.ts
import { renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'

import { exportApi } from './core/exportApi'
import { useExportApi } from './useExportApi'

it('returns the core exportApi object', () => {
  const { result } = renderHook(() => useExportApi())
  expect(result.current).toBe(exportApi)
})
