import { GraphObjectType } from '../NetworkModel'
import { DiscreteRange } from '../PropertyModel/DiscreteRange'
import { NumberRange } from '../PropertyModel/NumberRange'
import { AttributeName, ValueType } from '../TableModel'
import { VisualMappingFunction } from '../VisualStyleModel'
import { DisplayMode } from './DisplayMode'
import { FilterWidgetType } from './FilterWidgetType'
import { SelectionType } from './SelectionType'

/**
 * Interface for storing the filter configuration for building the filter UI.
 * This configuration will be passed to the Filter function to apply the filter.
 */
export interface FilterConfig {
  // Name of this filter. e.g. "checkboxFilter"
  readonly name: string

  // Target object to be filtered. Node or edge.
  target: GraphObjectType

  // Attribute (column) name to be filtered
  attributeName: AttributeName

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
  range: NumberRange | DiscreteRange<ValueType>
}
