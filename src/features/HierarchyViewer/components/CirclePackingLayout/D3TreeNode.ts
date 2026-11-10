/**
 * Datum for a D3 tree node for Circle Packing layout
 *
 */
export interface D3TreeNode {
  id: string // Unique ID of the node
  originalId?: string // Original ID of the node (used for duplicate nodes)
  parentId: string //
  name: string // Name of the node to be used as label
  size: number // Numeric value of the node to be used for circle size
  members: string[] // members assigned to this node
  selected?: boolean // Whether this node is selected
  // True for a protein ring: a ring generated for a subsystem member, which
  // has no row of its own in the node table. Subsystems leave it unset.
  isMember?: boolean
}
