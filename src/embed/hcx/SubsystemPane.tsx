import { useMemo, useState } from 'react'

import { DiscreteFilterValue } from '@/models/FilterModel'
import { IdType } from '@/models/IdType'
import { DiscreteRange } from '@/models/PropertyModel/DiscreteRange'

import { CyView } from '../CyView'
import { NodeAttributes } from '../NodeAttributes'
import { FilterWidget } from './FilterWidget'
import { Subsystem } from './loadSubsystem'
import { filterTable, hiddenByFilter, optionColors } from './subsystemFilter'

interface SubsystemPaneProps {
  subsystem: Subsystem
  selectedNodeIds: readonly IdType[]
  onSelectNode: (nodeId: IdType | undefined) => void
}

/**
 * The selected subsystem's interaction network, positioned by its circles
 * in the Cell View, with its filter widget when the network has one.
 */
export const SubsystemPane = ({
  subsystem,
  selectedNodeIds,
  onSelectNode,
}: SubsystemPaneProps) => {
  const { cyNetwork, filterConfig, drawing } = subsystem
  const [filterEnabled, setFilterEnabled] = useState(true)
  const [checked, setChecked] = useState<DiscreteFilterValue[]>(() =>
    filterConfig === undefined
      ? []
      : [...(filterConfig.range as DiscreteRange<DiscreteFilterValue>).values],
  )

  const hiddenIds = useMemo(
    () =>
      filterConfig === undefined || !filterEnabled
        ? undefined
        : hiddenByFilter(
            filterTable(filterConfig, cyNetwork.nodeTable, cyNetwork.edgeTable),
            filterConfig.attributeName,
            checked,
          ),
    [filterConfig, filterEnabled, checked, cyNetwork],
  )
  const colors = useMemo(
    () =>
      filterConfig === undefined
        ? new Map<DiscreteFilterValue, string>()
        : optionColors(cyNetwork.visualStyle, filterConfig),
    [filterConfig, cyNetwork],
  )

  const selectedRow =
    selectedNodeIds.length === 1
      ? cyNetwork.nodeTable.rows.get(selectedNodeIds[0])
      : undefined

  return (
    <div className="embed-viewer" data-testid="embed-subsystem-view">
      <CyView
        cyNetwork={cyNetwork}
        drawing={drawing}
        selectedNodeIds={selectedNodeIds}
        hiddenIds={hiddenIds}
        onNodeTap={onSelectNode}
        testId="embed-subsystem-canvas"
      />
      {filterConfig !== undefined && (
        <FilterWidget
          config={filterConfig}
          colors={colors}
          enabled={filterEnabled}
          checked={checked}
          onEnabledChange={setFilterEnabled}
          onCheckedChange={setChecked}
        />
      )}
      {selectedRow !== undefined && <NodeAttributes row={selectedRow} />}
    </div>
  )
}
