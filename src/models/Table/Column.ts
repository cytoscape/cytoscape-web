import { ValueTypeName } from "./ValueTypeName"

export interface Column {
  id: string
  name?: string // (Optional) Human-readable name
  type: ValueTypeName
}