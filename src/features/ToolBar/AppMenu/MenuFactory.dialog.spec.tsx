// src/features/ToolBar/AppMenu/MenuFactory.dialog.spec.tsx
//
// The service-app input dialog renders its parameters through the shared
// ParameterForm: array order, fieldsets from `groups`, every value a string
// on the way to the store, host-filled types hidden, and Submit gated by
// the real validation rules (regex, number/digits, min/max, valueList).

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/data/hooks/stores/AppStore'
import type { ServiceApp } from '@/models/AppModel/ServiceApp'
import { AppMenuItemDialog } from './MenuFactory'

vi.mock('@/data/hooks/stores/AppStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useAppStore: create<any>((set: any) => ({
      serviceApps: {} as Record<string, ServiceApp>,
      updateServiceParameter: vi.fn((url: string, key: string, value: string) =>
        set((state: any) => ({
          serviceApps: {
            ...state.serviceApps,
            [url]: {
              ...state.serviceApps[url],
              parameters: state.serviceApps[url].parameters.map((p: any) =>
                // the spec's fixture has unique labels, so key === displayName
                p.displayName === key ? { ...p, value } : p,
              ),
            },
          },
        })),
      ),
    })),
  }
})
vi.mock('@/data/hooks/stores/TableStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useTableStore: create(() => ({
      tables: {
        net1: {
          nodeTable: { columns: [{ name: 'name', type: 'string' }] },
          edgeTable: { columns: [{ name: 'weight', type: 'double' }] },
        },
      },
    })),
  }
})
vi.mock('@/data/hooks/stores/UiStateStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useUiStateStore: create(() => ({ ui: { activeNetworkView: 'net1' } })),
  }
})
vi.mock('@/data/hooks/stores/WorkspaceStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useWorkspaceStore: create(() => ({ workspace: { networkIds: ['net1'] } })),
  }
})
vi.mock('@/debug', () => ({
  logApp: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const URL = 'http://service.test/algo'

const makeApp = (): ServiceApp =>
  ({
    url: URL,
    name: 'Community Detection',
    description: 'Finds communities',
    version: '1',
    cyWebActions: [],
    cyWebMenuItem: { root: 'Apps', path: [{ name: 'CD', gravity: 1 }] },
    author: null,
    citation: null,
    parameters: [
      {
        displayName: 'Resolution',
        description: 'Higher finds smaller communities',
        type: 'text',
        validationType: 'number',
        defaultValue: '1.0',
        minValue: 0,
        maxValue: 10,
        validationHelp: 'Resolution must be between 0 and 10',
        groups: ['Advanced'],
      },
      {
        displayName: 'Algorithm',
        description: '',
        type: 'dropDown',
        valueList: ['louvain', 'leiden'],
        defaultValue: 'louvain',
      },
      {
        displayName: 'Weight column',
        description: '',
        type: 'edgeColumn',
        defaultValue: '',
      },
      {
        displayName: 'Directed',
        description: '',
        type: 'checkBox',
        defaultValue: 'true',
      },
      {
        displayName: 'Token',
        description: '',
        type: 'accessToken',
        defaultValue: '',
      },
    ],
  }) as unknown as ServiceApp

const renderDialog = (): { handleConfirm: ReturnType<typeof vi.fn> } => {
  const handleConfirm = vi.fn(async () => {})
  render(
    <AppMenuItemDialog
      app={useAppStore.getState().serviceApps[URL]}
      open={true}
      handleClose={vi.fn()}
      handleConfirm={handleConfirm}
    />,
  )
  return { handleConfirm }
}

describe('AppMenuItemDialog parameters', () => {
  beforeEach(() => {
    useAppStore.setState({ serviceApps: { [URL]: makeApp() } } as any)
    vi.mocked(useAppStore.getState().updateServiceParameter).mockClear()
  })

  it('renders the parameters through the form: groups, order, hidden token, edge columns from the edge table', () => {
    renderDialog()
    const advanced = screen.getByTestId('service-app-parameter-group-Advanced')
    expect(advanced.tagName).toBe('FIELDSET')
    expect(
      advanced.contains(
        screen.getByTestId('service-app-parameter-field-Resolution'),
      ),
    ).toBe(true)
    expect(screen.queryByText('Token')).toBeNull()
    // the service-style 'true' string renders checked
    expect(
      (
        screen.getByTestId(
          'service-app-parameter-field-Directed',
        ) as HTMLInputElement
      ).checked,
    ).toBe(true)

    fireEvent.mouseDown(
      screen.getByTestId('service-app-parameter-field-Weight column'),
    )
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      '(none)',
      'weight',
    ])
  })

  it('stringifies every edit on the way to the store', () => {
    renderDialog()
    const update = useAppStore.getState().updateServiceParameter

    fireEvent.click(screen.getByTestId('service-app-parameter-field-Directed'))
    expect(update).toHaveBeenLastCalledWith(URL, 'Directed', 'false')

    fireEvent.change(
      screen.getByTestId('service-app-parameter-field-Resolution'),
      {
        target: { value: '2.5' },
      },
    )
    expect(update).toHaveBeenLastCalledWith(URL, 'Resolution', '2.5')
  })

  it('disables Submit while a stored value is invalid, with the declared help', () => {
    useAppStore.setState((state: any) => ({
      serviceApps: {
        [URL]: {
          ...state.serviceApps[URL],
          parameters: state.serviceApps[URL].parameters.map((p: any) =>
            p.displayName === 'Resolution' ? { ...p, value: '50' } : p,
          ),
        },
      },
    }))
    renderDialog()
    expect(screen.getByText('Resolution must be between 0 and 10')).toBeTruthy()
    const submit = screen.getByRole('button', { name: 'Submit' })
    expect(submit.hasAttribute('disabled')).toBe(true)
  })

  it('enables Submit when every value validates, and Submit runs the service', () => {
    const { handleConfirm } = renderDialog()
    const submit = screen.getByRole('button', { name: 'Submit' })
    expect(submit.hasAttribute('disabled')).toBe(false)
    fireEvent.click(submit)
    expect(handleConfirm).toHaveBeenCalledTimes(1)
  })
})
