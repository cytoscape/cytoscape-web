import { CompactSelection, GridSelection } from '@glideapps/glide-data-grid'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Table, ValueTypeName } from '../../../models/TableModel'
import { TableToolbar, TableToolbarProps } from './TableToolbar'

// The forms are replaced so a test can submit a name directly: what is under
// test is the check the toolbar runs on submit.
const forms = vi.hoisted(() => ({
  create: undefined as any,
  edit: undefined as any,
}))

vi.mock('../TableColumnForm', () => ({
  CreateTableColumnForm: (props: any) => {
    forms.create = props
    return null
  },
  EditTableColumnForm: (props: any) => {
    forms.edit = props
    return null
  },
  DeleteTableColumnForm: () => null,
}))

const nodeTable: Table = {
  id: 'net-nodes',
  columns: [
    { name: 'name', type: ValueTypeName.String },
    { name: 'foo', type: ValueTypeName.String },
    { name: 'id', type: ValueTypeName.String },
  ],
  rows: new Map(),
}

const selectionOf = (index: number): GridSelection => ({
  columns: CompactSelection.fromSingleSelection(index),
  rows: CompactSelection.empty(),
})

const renderToolbar = (selectedIndex = 1) => {
  const props = {
    currentNetworkId: 'net',
    currentTable: nodeTable,
    nodeTable,
    edgeTable: undefined,
    tables: { net: {} },
    selection: selectionOf(selectedIndex),
    setSelection: vi.fn(),
    rows: [],
    // Grid columns have an id and a title, and no name
    allColumns: nodeTable.columns.map((c) => ({ id: c.name, title: c.name })),
    columns: nodeTable.columns.map((c) => ({ id: c.name, title: c.name })),
    tableDisplayConfiguration: undefined,
    createUpdatedTableDisplayConfiguration: vi.fn(() => ({})),
    setTableDisplayConfiguration: vi.fn(),
    setNetworkModified: vi.fn(),
    postEdit: vi.fn(),
    addColumn: vi.fn(),
    deleteColumn: vi.fn(),
    setColumnName: vi.fn(),
    applyValueToElements: vi.fn(),
    exclusiveSelect: vi.fn(),
    visualPropertiesDependentOnSelectedColumn: [],
    setMapping: vi.fn(),
    setSort: vi.fn(),
    duplicateColumn: vi.fn(),
  } as unknown as TableToolbarProps
  render(<TableToolbar {...props} />)
  return props
}

const submitCreate = (name: string): void => {
  act(() => {
    forms.create.onSubmit(name, ValueTypeName.String, 'x')
  })
}

const submitRename = (name: string): void => {
  act(() => {
    forms.edit.onSubmit(name)
  })
}

describe('TableToolbar column names (#951)', () => {
  beforeEach(() => {
    forms.create = undefined
    forms.edit = undefined
  })

  describe('create', () => {
    it.each(['name', 'NAME', 'Name'])('rejects the duplicate %s', (name) => {
      const props = renderToolbar()

      submitCreate(name)

      expect(props.addColumn).not.toHaveBeenCalled()
      expect(forms.create.error).toBe(
        `${name} already exists. Please enter a new unique column name`,
      )
    })

    it.each(['id', 'ID', 'Id', 'iD'])(
      'rejects the reserved name %s',
      (name) => {
        const props = renderToolbar()

        submitCreate(name)

        expect(props.addColumn).not.toHaveBeenCalled()
        expect(forms.create.error).toMatch(/reserved/)
      },
    )

    it('creates a column with a new name', () => {
      const props = renderToolbar()

      submitCreate('fresh')

      expect(props.addColumn).toHaveBeenCalledWith(
        'net',
        'node',
        'fresh',
        ValueTypeName.String,
        'x',
      )
    })
  })

  describe('rename', () => {
    it.each(['name', 'NAME'])('rejects the duplicate %s', (name) => {
      const props = renderToolbar()

      submitRename(name)

      expect(props.setColumnName).not.toHaveBeenCalled()
      expect(forms.edit.error).toBe(
        `${name} already exists. Please enter a new unique column name`,
      )
    })

    it('allows changing only the case of its own name', () => {
      const props = renderToolbar()

      submitRename('Foo')

      expect(props.setColumnName).toHaveBeenCalledWith(
        'net',
        'node',
        'foo',
        'Foo',
      )
      expect(forms.edit.error).toBeUndefined()
    })

    it.each(['id', 'ID', 'Id'])('rejects the reserved name %s', (name) => {
      const props = renderToolbar()

      submitRename(name)

      expect(props.setColumnName).not.toHaveBeenCalled()
      expect(forms.edit.error).toMatch(/reserved/)
    })

    it('rejects a case-only rename of an imported id column', () => {
      const props = renderToolbar(2)

      submitRename('ID')

      expect(props.setColumnName).not.toHaveBeenCalled()
      expect(forms.edit.error).toMatch(/reserved/)
    })

    it('still rejects submitting the unchanged name', () => {
      const props = renderToolbar()

      submitRename('foo')

      expect(props.setColumnName).not.toHaveBeenCalled()
      expect(forms.edit.error).toBe(
        'foo already exists. Please enter a new unique column name',
      )
    })
  })
})
