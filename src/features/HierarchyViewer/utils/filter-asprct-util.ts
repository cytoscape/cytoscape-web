import { DisplayMode, FilterConfig } from '../../../models/FilterModel'
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

    filterConfigs.push(filterConfig)
  })

  return filterConfigs
}
