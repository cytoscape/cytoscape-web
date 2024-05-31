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
    const config: FilterConfig = {
      name: sourceNetworkId,
      attributeName: filterAspect.attributeName,
      target: filterAspect.appliesTo,
      widgetType: FilterWidgetType.CHECKBOX,
      description: 'Filter nodes / edges by selected values',
      label,
      range: { values: [] },
      displayMode: DisplayMode.SHOW_HIDE,
      discreteFilterDetails: filter,
    }

    filterConfigs.push(config)
  })

  return filterConfigs
}
