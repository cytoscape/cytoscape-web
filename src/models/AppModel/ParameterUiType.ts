export const ParameterUiType = {
  Text: 'text',
  DropDown: 'dropDown',
  Radio: 'radio',
  CheckBox: 'checkBox',
  NodeColumn: 'nodeColumn',
  EdgeColumn: 'edgeColumn',
} as const

export type ParameterUiType =
  (typeof ParameterUiType)[keyof typeof ParameterUiType]
