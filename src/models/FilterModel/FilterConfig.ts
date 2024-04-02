import { DiscreteRange } from '../PropertyModel/DiscreteRange'
import { NumberRange } from '../PropertyModel/NumberRange'
import { ValueType } from '../TableModel'
import { VisualMappingFunction } from '../VisualStyleModel'
import { DisplayMode } from './DisplayMode'
import { Filter } from './Filter'
import { FilterWidgetType } from './FilterWidgetType'
import { SelectionType } from './SelectionType'

/**
 * Interface for the filter user interface
 */
export interface FilterConfig<T extends ValueType> {
  // Name of this filter. e.g. "checkboxFilter"
  name: string

  filter: Filter<NumberRange | DiscreteRange<T>>

  // Human-readable label for the filter
  label: string

  // More detailed description of the filter. Will be displayed in a tooltip
  description: string

  // (For discrete values only) Type of selection. Can be either "single" or "multiple"
  selectionType?: SelectionType

  // Type of the widget. Can be either "checkbox", "radiobutton", or "slider"
  readonly widgetType: FilterWidgetType

  // How to display the filtered results. Can be either "selection" or "show_hide"
  // If "select", then the filter will select those objects. If
  // "show_hide", then the filter will show the selected items only.
  displayMode: DisplayMode

  // Visual mapping function that the filter is linked to. This is used to
  // determine the visual representation of the filter. For example, if the
  // filter is linked to a color visual mapping function, then the selectable
  // options for the filter will be colored based on the visual mapping function.
  visualMapping?: VisualMappingFunction

  // Range of the values for the filter. If the widget type is "checkbox", then
  // the range is a DiscreteRange. If the widget type is "slider", then the
  // range is a NumberRange.
  range: NumberRange | DiscreteRange<T>

  readonly selectionMode?: SelectionMode

  // TBD - Convert this UI object into CX aspect
  toCx: () => any
}
