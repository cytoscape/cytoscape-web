import { useFilterStore } from '../../../data/hooks/stores/FilterStore'
import { FilterConfig } from '../../../models/FilterModel'
import { restoreFilterState } from './filterUtil'

/**
 * Register a filter config built from a subnetwork's filterWidgets aspect.
 *
 * The config is rebuilt every time the subsystem loads. When one is already
 * stored under the same name (restored from the database at startup, or
 * from an earlier load in this session), the user's checked values and
 * on/off switch are carried over onto the fresh config (#774). CheckboxFilter
 * then applies the restored range to the subnetwork's visibility bypass when
 * it mounts.
 *
 * @param config Config built from the aspect
 */
export const registerFilterConfig = (config: FilterConfig): void => {
  const { filterConfigs, addFilterConfig, updateFilterConfig } =
    useFilterStore.getState()
  // Own keys only: an inherited name such as 'constructor' is not a config
  const saved: FilterConfig | undefined = Object.hasOwn(
    filterConfigs,
    config.name,
  )
    ? filterConfigs[config.name]
    : undefined
  if (saved === undefined) {
    addFilterConfig(config)
    return
  }
  updateFilterConfig(config.name, restoreFilterState(config, saved))
}
