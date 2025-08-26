import * as React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { AttributesForm } from '../../Forms/AttributesForm'
import { mockNetworkId, mockTableStore } from '../../__tests__/testUtils'
import { ColorType } from '../../../../../../../models/VisualStyleModel/VisualPropertyValue'
import { AttributeName } from '../../../../../../../models/TableModel/AttributeName'

// Mock the table store
jest.mock('../../../../../../../store/TableStore', () => ({
  useTableStore: jest.fn(() => mockTableStore),
}))

describe('AttributesForm', () => {
  const mockOnUpdate = jest.fn()
  const defaultProps = {
    dataColumns: ['attribute1', 'attribute2'] as AttributeName[],
    colors: ['#FF6B6B', '#4ECDC4'] as ColorType[],
    colorScheme: 'Sequential1',
    currentNetworkId: mockNetworkId,
    onUpdate: mockOnUpdate,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the form with title and counter', () => {
    renderWithTheme(<AttributesForm {...defaultProps} />)

    expect(screen.getByText('Node Attributes & Colors')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('/ 16 slices')).toBeInTheDocument()
  })

  it('renders column headers', () => {
    renderWithTheme(<AttributesForm {...defaultProps} />)

    expect(screen.getByText('Order')).toBeInTheDocument()
    expect(screen.getByText('Node Attribute')).toBeInTheDocument()
    expect(screen.getByText('Color')).toBeInTheDocument()
    expect(screen.getByText('Remove')).toBeInTheDocument()
  })

  it('renders existing attributes with correct values', () => {
    renderWithTheme(<AttributesForm {...defaultProps} />)

    // Check that the attributes are rendered
    expect(screen.getByDisplayValue('attribute1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('attribute2')).toBeInTheDocument()
  })

  it('shows guidance when no attributes are configured', () => {
    renderWithTheme(
      <AttributesForm {...defaultProps} dataColumns={[]} colors={[]} />,
    )

    expect(screen.getByText('Getting Started')).toBeInTheDocument()
    expect(
      screen.getByText(/To create a chart, you need to add numeric attributes/),
    ).toBeInTheDocument()
  })

  it('hides guidance when hideGuidance is true', () => {
    renderWithTheme(
      <AttributesForm
        {...defaultProps}
        dataColumns={[]}
        colors={[]}
        hideGuidance={true}
      />,
    )

    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument()
  })

  it('calls onUpdate when adding a new attribute', () => {
    renderWithTheme(<AttributesForm {...defaultProps} />)

    const addButton = screen.getByText('ADD NODE ATTRIBUTE')
    fireEvent.click(addButton)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      ['attribute1', 'attribute2', 'attribute3'],
      ['#FF6B6B', '#4ECDC4', expect.any(String)], // New random color
    )
  })

  it('calls onUpdate when removing an attribute', () => {
    renderWithTheme(<AttributesForm {...defaultProps} />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    expect(mockOnUpdate).toHaveBeenCalledWith(['attribute2'], ['#4ECDC4'])
  })

  it('calls onUpdate when changing an attribute', () => {
    renderWithTheme(<AttributesForm {...defaultProps} />)

    const select = screen.getByDisplayValue('attribute1')
    fireEvent.mouseDown(select)

    const option = screen.getByText('attribute3')
    fireEvent.click(option)

    expect(mockOnUpdate).toHaveBeenCalledWith(
      ['attribute3', 'attribute2'],
      ['#FF6B6B', '#4ECDC4'],
    )
  })

  it('calls onUpdate when changing a color', () => {
    renderWithTheme(<AttributesForm {...defaultProps} />)

    const colorInputs = screen.getAllByDisplayValue(/#[0-9A-F]{6}/i)
    fireEvent.change(colorInputs[0], { target: { value: '#000000' } })

    expect(mockOnUpdate).toHaveBeenCalledWith(
      ['attribute1', 'attribute2'],
      ['#000000', '#4ECDC4'],
    )
  })

  it('disables add button when maximum slices reached', () => {
    const maxSlicesProps = {
      ...defaultProps,
      dataColumns: Array.from(
        { length: 16 },
        (_, i) => `attribute${i + 1}`,
      ) as AttributeName[],
      colors: Array.from({ length: 16 }, () => '#FF6B6B') as ColorType[],
    }

    renderWithTheme(<AttributesForm {...maxSlicesProps} />)

    const addButton = screen.getByText('Maximum Slices Reached')
    expect(addButton).toBeDisabled()
  })

  it('shows warning when maximum slices reached', () => {
    const maxSlicesProps = {
      ...defaultProps,
      dataColumns: Array.from(
        { length: 16 },
        (_, i) => `attribute${i + 1}`,
      ) as AttributeName[],
      colors: Array.from({ length: 16 }, () => '#FF6B6B') as ColorType[],
    }

    renderWithTheme(<AttributesForm {...maxSlicesProps} />)

    expect(screen.getByText('Maximum of 16 slices reached')).toBeInTheDocument()
    expect(
      screen.getByText(/You can remove existing attributes/),
    ).toBeInTheDocument()
  })

  it('shows warning when no numeric attributes available', () => {
    // Mock empty table store
    const emptyTableStore = {
      tables: {
        [mockNetworkId]: {
          nodeTable: {
            columns: [{ name: 'textAttribute', type: 'string' }],
            rows: new Map([['1', { textAttribute: 'text' }]]),
          },
        },
      },
    }

    jest.doMock('../../../../../../../store/TableStore', () => ({
      useTableStore: jest.fn(() => emptyTableStore),
    }))

    renderWithTheme(
      <AttributesForm {...defaultProps} dataColumns={[]} colors={[]} />,
    )

    expect(
      screen.getByText('No numeric data available for charts'),
    ).toBeInTheDocument()
  })

  it('handles reordering attributes', () => {
    renderWithTheme(<AttributesForm {...defaultProps} />)

    const upButtons = screen.getAllByRole('button', { name: /arrow upward/i })
    fireEvent.click(upButtons[1]) // Move second attribute up

    expect(mockOnUpdate).toHaveBeenCalledWith(
      ['attribute2', 'attribute1'],
      ['#4ECDC4', '#FF6B6B'],
    )
  })

  it('disables reorder buttons when only one attribute', () => {
    renderWithTheme(
      <AttributesForm
        {...defaultProps}
        dataColumns={['attribute1']}
        colors={['#FF6B6B']}
      />,
    )

    const upButtons = screen.getAllByRole('button', { name: /arrow upward/i })
    const downButtons = screen.getAllByRole('button', {
      name: /arrow downward/i,
    })

    upButtons.forEach((button) => expect(button).toBeDisabled())
    downButtons.forEach((button) => expect(button).toBeDisabled())
  })
})
