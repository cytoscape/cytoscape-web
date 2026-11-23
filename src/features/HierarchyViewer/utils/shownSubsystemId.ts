import { IdType } from '../../../models/IdType'
import { DuplicateNodeSeparator } from '../components/CirclePackingLayout/DataBuilderUtil'

/**
 * The subsystem whose subnetwork the viewer shows for a hierarchy selection,
 * or undefined when it shows none.
 *
 * One selected node is that subsystem. Several are one subsystem only when
 * they are all drawings of it (`<id>` and its copies `<id>-<n>d`); a selection
 * that spans several subsystems shows none.
 *
 * `MainPanel` renders by this rule, and the shared-link restore uses it to
 * tell whether the linked subsystem is still the one shown (#965).
 */
export const shownSubsystemId = (
  selectedNodes: readonly IdType[],
): IdType | undefined => {
  if (selectedNodes.length <= 1) {
    return selectedNodes[0]
  }
  const branches = new Set(
    selectedNodes.map((nodeId) => nodeId.split(DuplicateNodeSeparator)[0]),
  )
  return branches.size === 1 ? Array.from(branches)[0] : undefined
}
