import { DiscreteRange } from '../PropertyModel/DiscreteRange'
import { NumberRange } from '../PropertyModel/NumberRange'
import { Table, ValueType } from '../TableModel'
import { VisualMappingFunction } from '../VisualStyleModel'
import { DiscreteFilter, NumericFilter } from './Filter'

/**
 *
 */
export const FilterWidgetType = {
  CHECKBOX: 'checkbox',
  RADIOBUTTON: 'radiobutton',
  SLIDER: 'slider',
} as const

export type FilterWidgetType =
  (typeof FilterWidgetType)[keyof typeof FilterWidgetType]

export const SelectionMode = {
  SINGLE: 'single',
  MULTIPLE: 'multiple',
} as const

export type SelectionMode = (typeof SelectionMode)[keyof typeof SelectionMode]

export const FilteringMode = {
  SELECTION: 'selection',
  SHOW_HIDE: 'show_hide',
} as const

export type FilteringMode = (typeof FilteringMode)[keyof typeof FilteringMode]

/**
 * Interface for the filter user interface
 */
export interface FilterUiProps {
  filter: DiscreteFilter<ValueType> | NumericFilter

  // Human-readable label for the filter
  label: string

  // More detailed description of the filter. Will be displayed in a tooltip
  description: string

  // Type of the widget. Can be either "checkbox" or "slider"
  widgetType: FilterWidgetType

  // How to display the filtered results. Can be either "selection" or "show_hide"
  // If "selection", then the filter will select those objects. If
  // "show_hide", then the filter will show the selected items only.
  mode: FilteringMode

  // Visual mapping function that the filter is linked to. This is used to
  // determine the visual representation of the filter. For example, if the
  // filter is linked to a color visual mapping function, then the selectable
  // options for the filter will be colored based on the visual mapping function.
  visualMapping?: VisualMappingFunction

  // Range of the values for the filter. If the widget type is "checkbox", then
  // the range is a DiscreteRange. If the widget type is "slider", then the
  // range is a NumberRange.
  readonly range: NumberRange | DiscreteRange<ValueType>

  readonly selectionMode?: SelectionMode

  // Table data to be filtered
  table: Table

  // TBD - Convert this UI object into CX aspect
  toCx: () => any
}
