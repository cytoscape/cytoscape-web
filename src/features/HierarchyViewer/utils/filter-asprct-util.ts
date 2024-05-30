import {
  DisplayMode,
  FilterConfig,
  FilterWidgetType,
} from '../../../models/FilterModel'
import { IdType } from '../../../models/IdType'
import { FilterAspect, FilterAspects } from '../model/FilterAspects'

/**
 * Build FilterConfig objects from FilterAspects
 *
 * @param filterAspects
 */
export const createFilterFromAspect = (
  sourceNetworkId: IdType,
  filterAspects: FilterAspects,
): FilterConfig[] => {
  const filterConfigs: FilterConfig[] = []

  filterAspects.forEach((filterAspect: FilterAspect) => {
    const { filter, label } = filterAspect
    const filterConfig: FilterConfig = {
      name: sourceNetworkId, // Use the network ID to keep track of the linked filter
      description: 'Filter nodes / edges by selected values',
      attributeName: filterAspect.attributeName,
      target: filterAspect.appliesTo,
      label: label,
      widgetType: filterAspect.widgetType,
      range: { values: [] },
      displayMode: DisplayMode.SHOW_HIDE,
      discreteFilterDetails: filter,
    }
    const test1 = {
      name: sourceNetworkId,
      attributeName: filterAspect.attributeName,
      target: filterAspect.appliesTo,
      widgetType: FilterWidgetType.CHECKBOX,
      description: 'Filter nodes / edges by selected values',
      label: 'Interaction edge filter22',
      range: { values: [] },
      displayMode: DisplayMode.SHOW_HIDE,
      discreteFilterDetails: filter,
    }

    // filterConfigs.push(filterConfig)
    filterConfigs.push(test1)
  })

  return filterConfigs
}
