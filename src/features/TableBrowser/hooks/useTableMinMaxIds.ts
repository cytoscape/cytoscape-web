import React from 'react'
import { Table } from '../../../models/TableModel'

export const useTableMinMaxIds = (nodeTable?: Table, edgeTable?: Table) => {
  return React.useMemo(() => {
    let minN = Infinity
    let maxN = -Infinity
    if (nodeTable?.rows) {
      for (const key of nodeTable.rows.keys()) {
        const num = +key
        if (num < minN) minN = num
        if (num > maxN) maxN = num
      }
    }

    let minE = Infinity
    let maxE = -Infinity
    if (edgeTable?.rows) {
      for (const key of edgeTable.rows.keys()) {
        const num = +key.slice(1) // Assuming edge ids start with 'e'
        if (num < minE) minE = num
        if (num > maxE) maxE = num
      }
    }

    return {
      minNodeId: minN === Infinity ? undefined : minN,
      maxNodeId: maxN === -Infinity ? undefined : maxN,
      minEdgeId: minE === Infinity ? undefined : minE,
      maxEdgeId: maxE === -Infinity ? undefined : maxE,
    }
  }, [nodeTable?.rows, edgeTable?.rows])
}
