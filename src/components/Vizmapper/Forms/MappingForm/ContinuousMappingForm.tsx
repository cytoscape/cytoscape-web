import * as React from 'react'
import { Box } from '@mui/material'

import { IdType } from '../../../../models/IdType'
import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../../models/VisualStyleModel'
import { ContinuousMappingFunction } from '../../../../models/VisualStyleModel/VisualMappingFunction'

import { Table } from '../../../../models/TableModel'

import { useTableStore } from '../../../../store/TableStore'

import { ContinuousColorMappingForm } from './ContinuousColorMappingForm'
import { ContinuousNumberMappingForm } from './ContinuousNumberMappingForm'
import { ContinuousDiscreteMappingForm } from './ContinuousDiscreteMappingForm'

export function ContinuousMappingForm(props: {
  currentNetworkId: IdType
  visualProperty: VisualProperty<VisualPropertyValueType>
}): React.ReactElement {
  const m: ContinuousMappingFunction | null = props.visualProperty
    ?.mapping as ContinuousMappingFunction

  if (m == null) {
    return <Box></Box>
  }

  const group = props.visualProperty.group
  const tables: Record<IdType, { nodeTable: Table; edgeTable: Table }> =
    useTableStore((state) => state.tables)
  const nodeTable = tables[props.currentNetworkId]?.nodeTable
  const edgeTable = tables[props.currentNetworkId]?.edgeTable
  const table = group === 'node' ? nodeTable : edgeTable

  const { attribute } = m
  const attributeType = table.columns.get(attribute)?.type

  const { min, max, controlPoints } = m

  if (
    attributeType !== 'double' &&
    attributeType !== 'integer' &&
    attributeType !== 'long'
  ) {
    return (
      <Box>{`Attribute '${attribute}' cannot have a continuous mapping function as it's type is '${
        attributeType as string
      }'.  Continuous mapping functions only work with integer, double and long data types. `}</Box>
    )
  }

  if (controlPoints == null || min == null || max == null) {
    return <Box>No continuous mapping exists.</Box>
  } else {
    if (props.visualProperty.type === 'color') {
      return (
        <ContinuousColorMappingForm
          currentNetworkId={props.currentNetworkId}
          visualProperty={props.visualProperty}
        />
      )
    } else if (props.visualProperty.type === 'number') {
      return <ContinuousNumberMappingForm {...props} />
    } else {
      return <ContinuousDiscreteMappingForm {...props} />
    }
  }
}
