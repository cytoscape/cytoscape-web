export const ParameterUiType = {
  Text: 'text',
  DropDown: 'dropDown',
  Radio: 'radio',
  CheckBox: 'checkBox',
  NodeColumn: 'nodeColumn',
  EdgeColumn: 'edgeColumn',
  // Auto-filled, hidden parameter types. The webapp resolves their value at
  // run time rather than showing an input to the user.
  // NdexUuid: full NDEx URL of the current network (CW-620).
  NdexUuid: 'ndexUUID',
} as const

export type ParameterUiType =
  (typeof ParameterUiType)[keyof typeof ParameterUiType]
