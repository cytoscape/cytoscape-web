// src/features/ToolBar/LayoutMenu/LayoutSelector.spec.tsx
//
// The Settings dialog's layout picker must round-trip engine and algorithm
// names that contain '-' or '::' — app engines are named after app ids and
// app algorithms carry the qualified `<appId>::<id>` name (#734). The old
// `${engine}-${algorithm}` join split on the first '-' and broke both.

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useLayoutStore } from '@/data/hooks/stores/LayoutStore'
import type { LayoutEngine } from '@/models/LayoutModel/LayoutEngine'
import {
  decodeLayoutSelection,
  encodeLayoutSelection,
  LayoutSelector,
} from './LayoutSelector'

vi.mock('@/data/hooks/stores/LayoutStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useLayoutStore: create<any>(() => ({
      layoutEngines: [] as LayoutEngine[],
    })),
  }
})

const engines: LayoutEngine[] = [
  {
    name: 'Cytoscape.js',
    defaultAlgorithmName: 'cose-bilkent',
    algorithms: {
      'cose-bilkent': {
        name: 'cose-bilkent',
        engineName: 'Cytoscape.js',
        displayName: 'CoSE Bilkent',
        type: 'force',
        description: '',
        parameters: {},
      },
    },
    apply: vi.fn(),
  },
  {
    name: 'my-app',
    appId: 'my-app',
    defaultAlgorithmName: 'my-app::row-layout',
    algorithms: {
      'my-app::row-layout': {
        name: 'my-app::row-layout',
        engineName: 'my-app',
        displayName: 'Row Layout',
        type: 'other',
        description: '',
        parameters: {},
      },
    },
    apply: vi.fn(),
  },
]

describe('LayoutSelector', () => {
  it('round-trips names containing - and ::', () => {
    for (const [engine, algorithm] of [
      ['Cytoscape.js', 'cose-bilkent'],
      ['my-app', 'my-app::row-layout'],
      ['a-b-c', 'x::y::z'],
    ]) {
      expect(
        decodeLayoutSelection(encodeLayoutSelection(engine, algorithm)),
      ).toEqual([engine, algorithm])
    }
    expect(decodeLayoutSelection('not json')).toBeUndefined()
    expect(decodeLayoutSelection('["only-one"]')).toBeUndefined()
  })

  it('reports the exact engine and algorithm of the chosen option', () => {
    useLayoutStore.setState({ layoutEngines: engines } as any)
    const setSelected = vi.fn()
    render(
      <LayoutSelector
        selectedEngine="Cytoscape.js"
        selectedAlgorithm="cose-bilkent"
        setSelected={setSelected}
      />,
    )

    // MUI Select: open via the combobox, then pick the option by label.
    fireEvent.mouseDown(
      within(screen.getByTestId('layout-selector-select')).getByRole(
        'combobox',
      ),
    )
    fireEvent.click(screen.getByRole('option', { name: 'Row Layout' }))

    expect(setSelected).toHaveBeenCalledWith('my-app', 'my-app::row-layout')
  })
})
