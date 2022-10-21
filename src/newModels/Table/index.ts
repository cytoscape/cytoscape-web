import { IdType } from "../IdType";
import { Column } from "./Column";
import { Row } from "./Row";

export interface Table {
  id: IdType
  columns: Column[],
  rows: Row[]
  
}