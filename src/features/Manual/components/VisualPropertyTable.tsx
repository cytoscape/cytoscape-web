import type { ReactElement } from 'react'

import type {
  VisualPropertyGroup,
  VisualPropertyValueTypeName,
} from '@/models/VisualStyleModel'
import { visualPropertyRows } from '../generated/visualPropertyRows'

// Typed over every value type: a new one fails the type check until it has a
// label here.
const TYPE_LABELS: Record<VisualPropertyValueTypeName, string> = {
  color: 'Color',
  number: 'Number',
  string: 'Text',
  boolean: 'Yes / No',
  font: 'Font',
  nodeShape: 'Node shape',
  edgeLine: 'Line type',
  nodeBorderLine: 'Line type',
  edgeArrowShape: 'Arrow shape',
  horizontalAlign: 'Alignment',
  verticalAlign: 'Alignment',
  visibility: 'Visible / hidden',
  nodeLabelPosition: 'Label position',
  customGraphic: 'Image or chart',
  customGraphicPosition: 'Position',
}

/**
 * The visual properties of one group, generated from the model
 * (`getDefaultVisualStyle`). The table changes when the model does; there is
 * no hand-kept copy to drift.
 */
export const VisualPropertyTable = ({
  group,
}: {
  group: VisualPropertyGroup
}): ReactElement => (
  <table data-testid={`manual-visual-properties-${group}`}>
    <thead>
      <tr>
        <th>Property</th>
        <th>Value</th>
        <th>Default</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      {visualPropertyRows(group).map((row) => (
        <tr key={row.names[0]}>
          <td>
            <strong>{row.displayName}</strong>
          </td>
          <td>{TYPE_LABELS[row.type]}</td>
          <td>
            <code>{row.defaultValue}</code>
          </td>
          <td>{row.description}</td>
        </tr>
      ))}
    </tbody>
  </table>
)
