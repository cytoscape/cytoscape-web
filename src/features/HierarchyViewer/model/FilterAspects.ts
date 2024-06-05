import { FilterWidgetType } from '../../../models/FilterModel'
import { DiscreteFilterDetails } from '../../../models/FilterModel/DiscreteFilterDetails'
import { GraphObjectType } from '../../../models/NetworkModel'
import { AttributeName } from '../../../models/TableModel'

export const FILTER_ASPECT_TAG = 'filterWidgets'

/**
 * Properties for the filter widget stored in CX
 *
 * This aspect is stored in the interaction network's attributes
 *
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
