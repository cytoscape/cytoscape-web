/**
 * Table model interfaces are exporeted here
 *
 * All functions should be accessed through the TableFn object
 *
 */

export { Table } from './Table'
export { Column } from './Column'
export { Row } from './Row'
export { AttributeName } from './AttributeName'
export { ValueType } from './ValueType'
export { ValueTypeName } from './ValueTypeName'

import * as TableFn from './impl/InMemoryTable'
export { TableFn as default }
