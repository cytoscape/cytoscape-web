import { ValueType, ValueTypeName } from '../../../../models/TableModel'
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

const getTypeLabel = (type: ValueTypeName): string => {
  const typeLabels: Record<ValueTypeName, string> = {
    [ValueTypeName.String]: 'String',
    [ValueTypeName.Integer]: 'Integer',
    [ValueTypeName.Long]: 'Long',
    [ValueTypeName.Double]: 'Double',
    [ValueTypeName.Boolean]: 'Boolean',
    [ValueTypeName.ListString]: 'List<String>',
    [ValueTypeName.ListInteger]: 'List<Integer>',
    [ValueTypeName.ListLong]: 'List<Long>',
    [ValueTypeName.ListDouble]: 'List<Double>',
    [ValueTypeName.ListBoolean]: 'List<Boolean>',
  }
  return typeLabels[type] || 'Unknown'
}

const getTypeColor = (type: ValueTypeName): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
  if (type.includes('list_of_')) {
    return 'primary'
  }
  switch (type) {
    case ValueTypeName.String:
      return 'default'
    case ValueTypeName.Integer:
    case ValueTypeName.Long:
      return 'success'
    case ValueTypeName.Double:
      return 'success'
    case ValueTypeName.Boolean:
      return 'secondary'
    default:
      return 'default'
  }
}

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
