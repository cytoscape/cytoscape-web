import { GraphObjectType } from '../NetworkModel'
import { DiscreteRange } from '../PropertyModel/DiscreteRange'
import { NumberRange } from '../PropertyModel/NumberRange'
import { ValueTypeName } from '../TableModel'

/**
 * Type of filters
 * 
 * appliesTo: Specifies the widget's applicability to "nodes" or "edges".
 * 

widgetType: Identifies the widget as either "checkbox" or "sliderbar".

mappingSource (optional): A visual property name linked to the widget. Checkbox widgets should correspond with discrete mappings, while slider bars should align with continuous mappings.

attributeName: The name of the attribute the widget filters on.
label (optional): The displayed label for the checkbox group or slider bar. 
tooltip (optional): Tooltip when a user mouse over the label. 
definition: Defines the widget's behavior and configuration, which can be either:
mappingTable:
value: The attribute value.
label: A human-readable label for the checkbox.
tooltip: tooltip for the label. 
range:
min: The slider bar's minimum value.
max: The maximum value of the slider bar.

 */

/**
 * Type of filters
 */
export const FilterType = {
  DISCRETE: 'discrete',
  CONTINUOUS: 'continuous',
} as const

export type FilterType = (typeof FilterType)[keyof typeof FilterType]

export const FilterWidgetType = {
  CHECKBOX: 'checkbox',
  SLIDER: 'slider',
} as const

export type FilterWidgetType =
  (typeof FilterWidgetType)[keyof typeof FilterWidgetType]

/**
 * Definition and state of the filter UI
 */
export interface FilterUI {
  // Human-readable label for the filter
  label: string
  description?: string
  widgetType: FilterWidgetType
}

/**
 * Base filter interface to be implemented by all filters
 */
export interface Filter<T extends ValueTypeName> {
  type: FilterType

  // Human readable name of the filter
  name: string

  target: GraphObjectType
  attributeName: string
  attributeType: T
  readonly range?: NumberRange | DiscreteRange<T>
}

// interface FilterFunction<T extends ValueTypeName, V> {
//   apply: (value: ValueType<T>) => V
// }
