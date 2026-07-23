import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDataEditorTheme } from './useDataEditorTheme'
import * as muiStyles from '@mui/material/styles'

vi.mock('@mui/material/styles', () => ({
  useTheme: vi.fn(),
}))

describe('useDataEditorTheme', () => {
  it('maps mui theme to data editor theme', () => {
    const mockTheme = {
      palette: {
        background: { default: '#111', paper: '#222' },
        action: { hover: '#333', focus: '#444', selected: '#555' },
        text: { primary: '#666', secondary: '#777', disabled: '#888' },
        primary: { main: '#999', contrastText: '#aaa' },
        divider: '#bbb',
      }
    }
    vi.mocked(muiStyles.useTheme).mockReturnValue(mockTheme as any)

    const { result } = renderHook(() => useDataEditorTheme())

    expect(result.current.bgHeader).toBe('#111')
    expect(result.current.bgCell).toBe('#222')
    expect(result.current.accentColor).toBe('#999')
  })
})
