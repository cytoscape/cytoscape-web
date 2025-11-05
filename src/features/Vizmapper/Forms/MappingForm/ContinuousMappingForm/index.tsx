import { Box } from '@mui/material'
import * as React from 'react'

import { useTableStore } from '../../../../../hooks/stores/TableStore'
import { IdType } from '../../../../../models/IdType'
import { Table, ValueTypeName } from '../../../../../models/TableModel'
import {
  VisualProperty,
  VisualPropertyValueType,
} from '../../../../../models/VisualStyleModel'
import { ContinuousMappingFunction } from '../../../../../models/VisualStyleModel/VisualMappingFunction'
import { VisualPropertyGroup } from '../../../../../models/VisualStyleModel/VisualPropertyGroup'
import { VisualPropertyValueTypeName } from '../../../../../models/VisualStyleModel/VisualPropertyValueTypeName'
import { ContinuousColorMappingForm } from './ContinuousColorMappingForm'
import { ContinuousDiscreteMappingForm } from './ContinuousDiscreteMappingForm'
import { ContinuousNumberMappingForm } from './ContinuousNumberMappingForm'

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
  const table = group === VisualPropertyGroup.Node ? nodeTable : edgeTable

  const { attribute } = m
  const attributeType = table.columns.find((c) => c.name === attribute)?.type

  const { min, max, controlPoints } = m

  if (
    attributeType !== ValueTypeName.Double &&
    attributeType !== ValueTypeName.Integer &&
    attributeType !== ValueTypeName.Long
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
    if (props.visualProperty.type === VisualPropertyValueTypeName.Color) {
      return (
        <ContinuousColorMappingForm
          currentNetworkId={props.currentNetworkId}
          visualProperty={props.visualProperty}
        />
      )
    } else if (
      props.visualProperty.type === VisualPropertyValueTypeName.Number
    ) {
      return <ContinuousNumberMappingForm {...props} />
    } else {
      return <ContinuousDiscreteMappingForm {...props} />
    }
  }
}
