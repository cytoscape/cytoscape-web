import { NDExProperty } from "./NDExProperty"
import { Visibility } from "./Visibility"
/**
 * JSON object from NDEx network summary API
 * 
 * @see https://docs.ndexbio.org/docs/network-summary-api.html
 * 
 * @category Model
 * @since 0.1.0
 */
export interface NetworkSummary {

  ownerUUID: string,
  isReadOnly: boolean,
  subnetworkIds: number[],
  isValid: boolean,
  warnings: string[],
  isShowcase: boolean,
  doi: string,
  isCertified: boolean,
  indexLevel: string,
  hasLayout: boolean,
  hasSample: boolean,
  cxFileSize: number,
  cx2FileSize: number,
  visibility: Visibility,
  nodeCount: number,
  edgeCount: number,
  completed: boolean,
  version: string,
  owner: string,
  description: string,
  name: string,
  properties: NDExProperty[],
  externalId: string,
  isDeleted: boolean,
  modificationTime: Date,
  creationTime: Date
}