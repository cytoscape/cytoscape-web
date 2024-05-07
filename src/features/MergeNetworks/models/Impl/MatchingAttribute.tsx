import { IdType } from '../../../../models/IdType'
import { Column } from '../../../../models/TableModel/Column'

export class MatchingAttribute {
    attributeForMatching: Record<IdType, Column>
    constructor() {
        this.attributeForMatching = {}
    }
    getAttributeForMatching() {
        return this.attributeForMatching
    }
    getAttributeForMatchingByNetId(id: IdType) {
        return this.attributeForMatching[id]
    }
    addAttributeForMatching(id: IdType, column: Column) {
        this.attributeForMatching[id] = column
    }
    removeAttributeForMatching(id: IdType) {
        delete this.attributeForMatching[id]
    }
    clearAttributeForMatching() {
        this.attributeForMatching = {}
    }
    isEmpty() {
        return Object.keys(this.attributeForMatching).length === 0
    }
    getAttributeForMatchingSize() {
        return Object.keys(this.attributeForMatching).length
    }
}