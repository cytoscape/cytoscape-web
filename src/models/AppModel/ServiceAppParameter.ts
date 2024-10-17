import { ColumnTypeFilter } from './ColumnTypeFilter'
import { ParameterUiType } from './ParameterUiType'
import { ValidationType } from './ValidationType'

export interface ServiceAppParameter {
  // Key of the parameter, used as the label
  displayName: string

  // Tooltip or hint
  description: string

  // Type of the input UI
  type: ParameterUiType

  // Only for the dropDown type. Define the selectable values
  valueList?: string[]

  defaultValue: string // Default value
  value?: string // Current/selected value

  // Other values: "dropDown", "radio", "checkBox", "nodeColumn", "edgeColumn"
  validationType: ValidationType

  // Only for node or edge column type.
  // Can be one of the cx2 supported datatype, number(for long or integer) or list(for any list type)
  columnTypeFilter: ColumnTypeFilter

  validationHelp: string

  // Ignored for certain types
  validationRegex: string

  minValue?: number // Applies to numeric textBox
  maxValue?: number // Applies to numeric textBox
}
