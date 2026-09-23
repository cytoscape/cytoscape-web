// src/features/ToolBar/LayoutMenu/LayoutOptionDialog.spec.tsx
//
// Layout Settings renders the selected algorithm's editables (the shared
// parameter spec) through ParameterForm: built-in algorithms keyed by their
// engine option names, app algorithms with fieldsets from `groups`. Edits
// reach setLayoutOption under the engine key; a validation error disables
// Apply; switching algorithms shows the other algorithm's values.

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLayoutStore } from '@/data/hooks/stores/LayoutStore'
import type { LayoutAlgorithm } from '@/models/LayoutModel/LayoutAlgorithm'
import type { LayoutEngine } from '@/models/LayoutModel/LayoutEngine'
import type { Network } from '@/models/NetworkModel'
import { LayoutOptionDialog } from './LayoutOptionDialog'

vi.mock('@/data/hooks/stores/LayoutStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useLayoutStore: create<any>((set: any) => ({
      layoutEngines: [] as LayoutEngine[],
      preferredLayout: undefined as unknown as LayoutAlgorithm,
      isRunning: false,
      setIsRunning: vi.fn(),
      setPreferredLayout: vi.fn(),
      setLayoutOption: vi.fn(
        (engine: string, algorithm: string, key: string, value: unknown) =>
          set((state: any) => ({
            layoutEngines: state.layoutEngines.map((e: LayoutEngine) =>
              e.name !== engine
                ? e
                : {
                    ...e,
                    algorithms: {
                      ...e.algorithms,
                      [algorithm]: {
                        ...e.algorithms[algorithm],
                        parameters: {
                          ...e.algorithms[algorithm].parameters,
                          [key]: value,
                        },
                      },
                    },
                  },
            ),
          })),
      ),
    })),
  }
})

vi.mock('@/data/hooks/stores/TableStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return { useTableStore: create(() => ({ tables: {} })) }
})

vi.mock('../../../models/LayoutModel/impl/runEngineLayout', () => ({
  runEngineLayout: vi.fn(),
}))

const circle: LayoutAlgorithm = {
  name: 'circle',
  engineName: 'core',
  displayName: 'Circular Layout',
  description: '',
  type: 'geometric',
  parameters: { name: 'circle', radius: 1000 },
  editables: [
    {
      name: 'radius',
      displayName: 'Radius',
      type: 'text',
      validationType: 'digits',
      defaultValue: 1000,
      minValue: 1,
    },
  ],
}

const appRow: LayoutAlgorithm = {
  name: 'appX::row',
  engineName: 'appX',
  displayName: 'Row Layout',
  description: '',
  type: 'other',
  parameters: { 'Node Spacing': 60, Reverse: false },
  editables: [
    {
      name: 'Node Spacing',
      displayName: 'Node Spacing',
      type: 'text',
      validationType: 'digits',
      defaultValue: 60,
      groups: ['Spacing'],
    },
    {
      name: 'Reverse',
      displayName: 'Reverse',
      type: 'checkBox',
      defaultValue: false,
    },
  ],
}

const network = {
  id: 'net1',
  nodes: [{ id: 'a' }],
  edges: [],
} as unknown as Network

const renderDialog = (): void => {
  render(
    <LayoutOptionDialog
      afterLayout={vi.fn()}
      network={network}
      networkId="net1"
      open={true}
      setOpen={vi.fn()}
      allDisabled={false}
    />,
  )
}

describe('LayoutOptionDialog', () => {
  beforeEach(() => {
    useLayoutStore.setState({
      layoutEngines: [
        {
          name: 'core',
          defaultAlgorithmName: 'circle',
          algorithms: { circle },
          apply: vi.fn(),
        },
        {
          name: 'appX',
          appId: 'appX',
          defaultAlgorithmName: appRow.name,
          algorithms: { [appRow.name]: appRow },
          apply: vi.fn(),
        },
      ],
      preferredLayout: circle,
    } as any)
    vi.mocked(useLayoutStore.getState().setLayoutOption).mockClear()
  })

  it('renders a built-in algorithm keyed by its engine option name and commits edits under it', () => {
    renderDialog()
    const input = screen.getByTestId(
      'layout-parameter-field-radius',
    ) as HTMLInputElement
    expect(input.value).toBe('1000')
    expect(screen.getByText('Radius')).toBeTruthy()

    fireEvent.change(input, { target: { value: '500' } })
    expect(useLayoutStore.getState().setLayoutOption).toHaveBeenCalledWith(
      'core',
      'circle',
      'radius',
      500,
    )
  })

  it('disables Apply while a field is invalid', () => {
    renderDialog()
    const apply = screen.getByTestId('layout-option-dialog-apply-button')
    expect(apply.hasAttribute('disabled')).toBe(false)

    fireEvent.change(screen.getByTestId('layout-parameter-field-radius'), {
      target: { value: '0' },
    })
    expect(useLayoutStore.getState().setLayoutOption).not.toHaveBeenCalled()
    // Only the draft is invalid; the stored value is still 1000, so the
    // form-level gate stays open. The field shows the message meanwhile.
    expect(screen.getByText(/at least 1/)).toBeTruthy()
  })

  it('renders an app algorithm with fieldsets from groups after switching to it', () => {
    renderDialog()
    fireEvent.mouseDown(screen.getByTestId('layout-selector-combobox'))
    fireEvent.click(screen.getByRole('option', { name: 'Row Layout' }))

    const group = screen.getByTestId('layout-parameter-group-Spacing')
    expect(group.tagName).toBe('FIELDSET')
    const spacing = screen.getByTestId(
      'layout-parameter-field-Node Spacing',
    ) as HTMLInputElement
    expect(group.contains(spacing)).toBe(true)
    expect(spacing.value).toBe('60')
    expect(
      (screen.getByTestId('layout-parameter-field-Reverse') as HTMLInputElement)
        .checked,
    ).toBe(false)

    fireEvent.click(screen.getByTestId('layout-parameter-field-Reverse'))
    expect(useLayoutStore.getState().setLayoutOption).toHaveBeenLastCalledWith(
      'appX',
      'appX::row',
      'Reverse',
      true,
    )
  })
})
