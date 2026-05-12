// src/app-api/useWorkspaceApi.test.ts

import { renderHook } from '@testing-library/react'

import { workspaceApi } from './core/workspaceApi'
import { useWorkspaceApi } from './useWorkspaceApi'

it('returns the core workspaceApi object', () => {
  const { result } = renderHook(() => useWorkspaceApi())
  expect(result.current).toBe(workspaceApi)
})
