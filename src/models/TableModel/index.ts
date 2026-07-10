/**
 * Table model interfaces are exporeted here
 *
 * All functions should be accessed through the TableFn object
 *
 */

import * as TableFn from './impl/inMemoryTable'

export type { AttributeName } from './AttributeName'
export type { Column } from './Column'
export type { Table } from './Table'
export type { ValueType } from './ValueType'
export { ValueTypeName } from './ValueTypeName'

export { TableFn as default }
