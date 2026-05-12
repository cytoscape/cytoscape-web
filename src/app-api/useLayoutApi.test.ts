// src/app-api/useLayoutApi.test.ts

import { renderHook } from '@testing-library/react'

// Mock LayoutStore to avoid @cosmograph/cosmos ESM incompatibility in Jest
jest.mock('../data/hooks/stores/LayoutStore', () => ({
  useLayoutStore: {
    getState: jest.fn(() => ({
      layoutEngines: [],
      preferredLayout: {},
      setIsRunning: jest.fn(),
    })),
  },
}))

import { layoutApi } from './core/layoutApi'
import { useLayoutApi } from './useLayoutApi'

it('returns the core layoutApi object', () => {
  const { result } = renderHook(() => useLayoutApi())
  expect(result.current).toBe(layoutApi)
})
