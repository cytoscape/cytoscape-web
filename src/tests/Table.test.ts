// import 'isomorphic-fetch'

// import { IdType } from '../models/IdType'
// import TableFn, {
//   AttributeName,
//   ValueType,
//   ValueTypeName,
// } from '../models/TableModel'
// import { Cx2 } from '../utils/cx/Cx2'
// import * as cxUtil from '../utils/cx/cx2-util'
// import { CxValue } from '../utils/cx/Cx2/CxValue'

// test('create an empty Table', () => {
//   const tableId1: IdType = 'table1'
//   const table = TableFn.createTable(tableId1)

//   expect(table).toEqual({
//     id: tableId1,
//     columns: new Map<AttributeName, ValueTypeName>(),
//     rows: new Map<IdType, Record<AttributeName, ValueType>>(),
//   })
// })

// test('load CX and crfeate node/edge tables', async () => {
//   const MUSIC_URL =
//     'https://public.ndexbio.org/v3/networks/7fc70ab6-9fb1-11ea-aaef-0ac135e8bacf'

//   const response = await fetch(MUSIC_URL)

//   if (!response.ok) {
//     throw new Error(`Error! status: ${response.status}`)
//   }

//   const cx: Cx2 = await response.json()
//   expect(cx).toBeDefined()
//   expect(Array.isArray(cx)).toBe(true)

//   const nodes = cxUtil.getNodes(cx)
//   const edges = cxUtil.getEdges(cx)

//   expect(nodes).toBeDefined()
//   expect(edges).toBeDefined()
//   expect(Array.isArray(nodes)).toBe(true)
//   expect(Array.isArray(edges)).toBe(true)

//   const nodeAttributes: Map<
//     string,
//     Record<string, CxValue>
//   > = cxUtil.getNodeAttributes(cx)

//   const table = TableFn.createTable('table2')

//   const attrLength = nodeAttributes.size

//   TableFn.insertRows(
//     table,
//     [...nodeAttributes.keys()].map((id) => [
//       id,
//       nodeAttributes.get(id) as Record<string, ValueType>,
//     ]),
//   )

//   expect(table.rows.size).toBe(attrLength)
//   expect(table.rows.size).toBe(nodes.length)
//   const node1 = nodes[0]
//   const attr1 = table.rows.get(node1.id.toString())
//   expect(attr1).toBeDefined()
//   console.log(attr1)
// })
