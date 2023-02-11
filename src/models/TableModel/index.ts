/**
 * Table model interfaces are exporeted here
 *
 * All functions should be accessed through the TableFn object
 *
 */

import * as TableFn from './impl/InMemoryTable'

export { Table } from './Table'
export { Column } from './Column'
export { AttributeName } from './AttributeName'
export { ValueType } from './ValueType'
export { ValueTypeName } from './ValueTypeName'

export { TableFn as default }
