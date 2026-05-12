// src/app-api/useNetworkApi.test.ts

import { renderHook } from '@testing-library/react'

import { networkApi } from './core/networkApi'
import { useNetworkApi } from './useNetworkApi'

it('returns the core networkApi object', () => {
  const { result } = renderHook(() => useNetworkApi())
  expect(result.current).toBe(networkApi)
})
