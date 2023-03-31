import { ValueType, ValueTypeName } from '../../../../models/TableModel'
import { BooleanEditor } from './BooleanEditor'
import { NumberEditor } from './NumberEditor'
import { StringEditor } from './StringEditor'

interface ValueEditorProps {
  optionName: string
  description: string
  valueType: ValueTypeName
  value: ValueType
  setValue: (optionName: string, value: ValueType) => void
}

export const ValueEditor = ({
  optionName,
  description,
  valueType,
  value,
  setValue,
}: ValueEditorProps): JSX.Element => {
  if (
    valueType === ValueTypeName.Integer ||
    valueType === ValueTypeName.Double ||
    valueType === ValueTypeName.Long
  ) {
    return (
      <NumberEditor
        optionName={optionName}
        description={description}
        value={value as number}
        setValue={setValue}
      />
    )
  } else if (valueType === ValueTypeName.Boolean) {
    // Return ListItem with Checkbox
    return (
      <BooleanEditor
        optionName={optionName}
        description={description}
        value={value as boolean}
        setValue={setValue}
      />
    )
  } else {
    return (
      <StringEditor
        optionName={optionName}
        description={description}
        value={value as string}
        setValue={setValue}
      />
    )
  }
}
