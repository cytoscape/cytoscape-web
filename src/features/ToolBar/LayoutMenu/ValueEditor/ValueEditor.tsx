import { ValueType, ValueTypeName } from '../../../../models/TableModel'
import {
  dataTypeChipColor,
  dataTypeLabel,
  DataTypeChipColor,
} from '../../../../models/TableModel/impl/dataTypeDisplay'
import { BooleanEditor } from './BooleanEditor'
import { ListEditor } from './ListEditor'
import { NumberEditor } from './NumberEditor'
import { StringEditor } from './StringEditor'

interface ValueEditorProps {
  optionName: string
  description: string
  valueType: ValueTypeName
  value: ValueType
  setValue: (optionName: string, value: ValueType) => void
  tableLayout?: boolean
  error?: boolean
  showTypeChip?: boolean
}

// Delegated to the shared data-type display module (CW-562) so labels/colors
// are consistent with the rest of the app.
const getTypeLabel = (type: ValueTypeName): string => dataTypeLabel(type)

const getTypeColor = (type: ValueTypeName): DataTypeChipColor =>
  dataTypeChipColor(type)

export const ValueEditor = ({
  optionName,
  description,
  valueType,
  value,
  setValue,
  tableLayout = false,
  error = false,
  showTypeChip = false,
}: ValueEditorProps): JSX.Element => {
  const isListType = 
    valueType === ValueTypeName.ListString ||
    valueType === ValueTypeName.ListInteger ||
    valueType === ValueTypeName.ListLong ||
    valueType === ValueTypeName.ListDouble ||
    valueType === ValueTypeName.ListBoolean

  if (isListType) {
    return (
      <ListEditor
        optionName={optionName}
        description={description}
        valueType={valueType}
        value={value}
        setValue={setValue}
        typeLabel={showTypeChip ? getTypeLabel(valueType) : undefined}
        typeColor={getTypeColor(valueType)}
        tableLayout={tableLayout}
        error={error}
      />
    )
  } else if (
    valueType === ValueTypeName.Integer ||
    valueType === ValueTypeName.Double ||
    valueType === ValueTypeName.Long
  ) {
    return (
      <NumberEditor
        optionName={optionName}
        description={description}
        value={value as number}
        valueType={valueType}
        setValue={setValue}
        typeLabel={showTypeChip ? getTypeLabel(valueType) : undefined}
        typeColor={getTypeColor(valueType)}
        tableLayout={tableLayout}
        error={error}
      />
    )
  } else if (valueType === ValueTypeName.Boolean) {
    return (
      <BooleanEditor
        optionName={optionName}
        description={description}
        value={value as boolean}
        setValue={setValue}
        typeLabel={showTypeChip ? getTypeLabel(valueType) : undefined}
        typeColor={getTypeColor(valueType)}
        tableLayout={tableLayout}
      />
    )
  } else {
    return (
      <StringEditor
        optionName={optionName}
        description={description}
        value={value as string}
        setValue={setValue}
        typeLabel={showTypeChip ? getTypeLabel(valueType) : undefined}
        typeColor={getTypeColor(valueType)}
        tableLayout={tableLayout}
        error={error}
      />
    )
  }
}
