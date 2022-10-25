import { Table } from ".";
import { IdType } from "../IdType";
import { Column } from "./Column";

export const createTable = (id: IdType): Table => {
  return {
    id,
    columns: [],
    rows: [],
  }
}

export const addColumn = (table: Table, columns: Column[]): Table => {
  const newColumns: Column[] = [...table.columns, ...columns]
  table.columns = newColumns
  return table
}