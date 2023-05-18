import { Aspect } from '../Aspect'
import { AttributeValue } from './AttributeValue'

export interface AttributeDeclarations extends Aspect {
  attributeDeclarations: [AttributeDeclaration]
}

export interface AttributeDeclaration {
  nodes: Attributes
  edges: Attributes
  networkAttributes: Attributes
}

export interface Attributes {
  [key: string]: AttributeValue
}
