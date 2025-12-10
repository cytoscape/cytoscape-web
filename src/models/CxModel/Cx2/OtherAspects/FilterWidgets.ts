import { FilterWidgetType } from '../../../FilterModel'
import { DiscreteFilterDetails } from '../../../FilterModel/DiscreteFilterDetails'
import { GraphObjectType } from '../../../NetworkModel'
import { AttributeName } from '../../../TableModel'

export const FILTER_ASPECT_TAG = 'filterWidgets'

/**
 * Properties for the filter widget stored in CX2
 *
 * This aspect is stored in the interaction network's opaque aspects
 */
export type FilterAspects = FilterAspect[]

export interface FilterAspect {
  widgetType: FilterWidgetType
  filterMode: GraphObjectType
  appliesTo: GraphObjectType
  attributeName: AttributeName
  label: string
  filter: DiscreteFilterDetails[]
  mappingSource: string
}
