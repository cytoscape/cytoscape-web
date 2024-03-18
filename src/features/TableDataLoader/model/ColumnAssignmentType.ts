export const ColumnAssignmentType = {
  NotImported: 'notimported',
  SourceNode: 'sourcenode',
  TargetNode: 'targetnode',
  SourceNodeAttribute: 'sourcenodeattribute',
  TargetNodeAttribute: 'targetnodeattribute',
  EdgeAttribute: 'edgeattribute',
  InteractionType: 'interactiontype',
} as const
export type ColumnAssignmentType =
  (typeof ColumnAssignmentType)[keyof typeof ColumnAssignmentType]
