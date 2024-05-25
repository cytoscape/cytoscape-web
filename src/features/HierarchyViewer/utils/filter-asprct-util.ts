import { DisplayMode, FilterConfig } from '../../../models/FilterModel'
import {
  FilterAspect,
  FilterAspects,
  FilterOptions,
} from '../model/FilterAspects'

/**
 * Build FilterConfig objects from FilterAspects
 *
 * @param filterAspects
 */
export const createFilterFromAspect = (
  filterAspects: FilterAspects,
): FilterConfig[] => {
  const filterConfigs: FilterConfig[] = []

  filterAspects.forEach((filterAspect: FilterAspect) => {
    const { filter, mappingSource } = filterAspect

    const visualMapping = createVisualMappingFromFilter(
      filter[0],
      mappingSource,
    )

    const filterConfig: FilterConfig = {
      name: 'test filter',
      description: 'Filter nodes / edges by selected values',
      attributeName: filterAspect.attributeName,
      target: filterAspect.appliesTo,
      label: filterAspect.label,
      widgetType: filterAspect.widgetType,
      range: { values: [] },
      displayMode: DisplayMode.SHOW_HIDE,
    }

    filterConfigs.push(filterConfig)
  })

  return filterConfigs
}

const createVisualMappingFromFilter = (
  filter: FilterOptions,
  mappingSource: string,
) => {
  return {
    mappingType: 'discrete',
    mappingSource,
    mappingColumn: filter.predicate,
    mappingColumnValues: filter.value,
  }
}
