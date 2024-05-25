import { FilterWidgetType } from '../../../models/FilterModel'
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
  filter: FilterOptions[]
  mappingSource: string
}

export interface FilterOptions {
  predicate: string
  criterion?: string
  description: string
  tooltip?: string
  value?: string
}
