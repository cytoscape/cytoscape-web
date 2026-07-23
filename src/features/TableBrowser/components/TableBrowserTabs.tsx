import React from 'react'
import { Tab, Tabs, Tooltip } from '@mui/material'

export interface TableBrowserTabsProps {
  currentTabIndex: number
  handleChange: (event: React.SyntheticEvent, newValue: number) => void
  selectedNodesCount: number
  selectedEdgesCount: number
  tabsHeight: number
}

export const TableBrowserTabs: React.FC<TableBrowserTabsProps> = ({
  currentTabIndex,
  handleChange,
  selectedNodesCount,
  selectedEdgesCount,
  tabsHeight,
}) => {
  return (
    <Tabs
      data-testid="table-browser-tabs"
      value={currentTabIndex}
      onChange={handleChange}
      aria-label="tabs"
      sx={{
        height: tabsHeight,
        minHeight: tabsHeight,
        '& button': {
          minHeight: tabsHeight,
          height: tabsHeight,
          width: 200,
        },
      }}
    >
      <Tab
        data-testid="table-browser-nodes-tab"
        label={
          <Tooltip
            title={
              selectedNodesCount > 0
                ? `The table is showing ${selectedNodesCount} selected nodes. Deselect all nodes in the network view to show the complete list of nodes.`
                : 'The table is showing all nodes in the network. Select one or more nodes in the network to filter this table.'
            }
          >
            <>
              Nodes
              {selectedNodesCount > 0 ? ` (${selectedNodesCount})` : ''}
            </>
          </Tooltip>
        }
      />
      <Tab
        data-testid="table-browser-edges-tab"
        label={
          <Tooltip
            title={
              selectedEdgesCount > 0
                ? `The table is showing ${selectedEdgesCount} selected edges. Deselect all edges in the network view to show the complete list of edges.`
                : 'The table is showing all edges in the network. Select one or more edges in the network to filter this table.'
            }
          >
            <>
              Edges
              {selectedEdgesCount > 0 ? ` (${selectedEdgesCount})` : ''}
            </>
          </Tooltip>
        }
      />
      <Tab data-testid="table-browser-network-tab" label="Network" />
    </Tabs>
  )
}
