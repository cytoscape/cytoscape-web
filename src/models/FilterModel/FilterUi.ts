import { DiscreteRange } from '../PropertyModel/DiscreteRange'
import { NumberRange } from '../PropertyModel/NumberRange'
import { ValueType } from '../TableModel'
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

/**
 * Interface for the filter user interface
 */
export interface FilterUi {
  filter: DiscreteFilter<ValueType> | NumericFilter

  // Human-readable label for the filter
  label: string

  // More detailed description of the filter. Will be displayed in a tooltip
  description: string

  // Type of the widget. Can be either "checkbox" or "slider"
  widgetType: FilterWidgetType

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

  // TBD - Convert this UI object into CX aspect
  toCx: () => any
}
