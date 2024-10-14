export interface ServiceAppParameter {
  // Key of the parameter, used as the label
  displayName: string

  // Tooltip or hint
  description: string

  // Other values: "dropDown", "radio", "checkBox", "nodeColumn", "edgeColumn"
  type: string

  valueList: string[] // Applicable when type="dropDown"
  defaultValue: string // Default or selected value
  validationType: 'string|number|digits' // Data type is only used for text field or data type. It is ignored for other input types.
  columnTypeFilter: 'number|list|<cx2 type>' //Only for node or edge column type.
  //Can be one of the cx2 supported datatype, number(for long or integer) or list(for any list type)

  validationHelp: string
  validationRegex: string // Ignored for certain types
  minValue?: number // Applies to numeric textBox
  maxValue?: number // Applies to numeric textBox
}
