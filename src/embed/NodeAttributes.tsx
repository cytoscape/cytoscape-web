import { AttributeName, ValueType } from '@/models/TableModel'

interface NodeAttributesProps {
  row: Record<AttributeName, ValueType>
}

/** The clicked node's attributes, floating over the top-right corner. */
export const NodeAttributes = ({ row }: NodeAttributesProps) => (
  <div
    className="embed-paper embed-attributes"
    data-testid="embed-node-attributes"
  >
    <table>
      <tbody>
        {Object.entries(row).map(([name, value]) => (
          <tr key={name}>
            <th>{name}</th>
            <td>{Array.isArray(value) ? value.join(', ') : String(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
