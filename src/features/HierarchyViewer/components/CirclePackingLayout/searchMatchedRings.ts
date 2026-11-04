import { HierarchyNode } from 'd3-hierarchy'

import { selectionMatchesSearch } from '../../../../models/FilterModel/impl/filterStoreImpl'
import { SearchRun } from '../../../../models/FilterModel/Search'
import { IdType } from '../../../../models/IdType'
import {
  createFuseIndexFromRecords,
  runSearch,
} from '../../../ToolBar/Search/searchUtil'
import { D3TreeNode } from './D3TreeNode'

const NO_RINGS: ReadonlySet<string> = new Set()

/**
 * The protein rings of the Cell View that a search on the hierarchy matched
 * (#930).
 *
 * A protein ring is drawn from a subsystem's member list and has no row in
 * the node table, so the search itself cannot select it: the search selects
 * the subsystems whose columns match. This finds, inside the subsystems the
 * search selected, the protein rings whose name matches the query, with the
 * search's own Contains/Exact mode. The rings of every copy of a subsystem
 * that the hierarchy reaches more than once count.
 *
 * Each ring is one protein, so it matches when it matches any token of the
 * query: the AND operator already decided which subsystems were selected.
 *
 * The rings stay matched while the selection is still the search's result.
 * Once the user selects something else (a ring, Select ▸ Deselect All), the
 * search no longer describes what is shown, and nothing matches. `SearchBox`
 * then also clears the recorded search, so selecting the same nodes again by
 * other means does not bring the rings back.
 *
 * @param root Root of the Cell View's hierarchy; `{}` when it could not be
 *   built
 * @param run The last search, from the filter store
 * @param hierarchyId Id of the hierarchy network the Cell View draws
 * @param selectedNodeIds Nodes selected in the hierarchy now
 * @returns Ids (`D3TreeNode.id`) of the matched protein rings
 */
export const findSearchMatchedRings = (
  root: HierarchyNode<D3TreeNode> | undefined,
  run: SearchRun | undefined,
  hierarchyId: IdType,
  selectedNodeIds: readonly IdType[],
): ReadonlySet<string> => {
  if (
    run === undefined ||
    run.networkId !== hierarchyId ||
    run.query.trim() === '' ||
    run.nodeIds.length === 0 ||
    !selectionMatchesSearch(run, selectedNodeIds) ||
    typeof root?.leaves !== 'function'
  ) {
    return NO_RINGS
  }

  const selectedSubsystems = new Set<IdType>(run.nodeIds)
  const candidates = root.leaves().filter((leaf) => {
    const { parent } = leaf
    return (
      leaf.data.isMember === true &&
      parent !== null &&
      selectedSubsystems.has(parent.data.originalId ?? parent.data.id)
    )
  })
  if (candidates.length === 0) {
    return NO_RINGS
  }

  const index = createFuseIndexFromRecords(
    candidates.map((ring) => ({
      id: ring.data.id,
      name: String(ring.data.name ?? ''),
    })),
    ['name'],
  )
  const { exact } = run.options
  // OR: a ring matches when its name matches any token (see above)
  return new Set(runSearch(index, run.query, 'OR', exact))
}
