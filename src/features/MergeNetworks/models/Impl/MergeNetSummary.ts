import cloneDeep from "lodash/cloneDeep";
import { IdType } from "../../../../models/IdType";
import { NdexNetworkProperty, NdexNetworkSummary } from "../../../../models/NetworkSummaryModel";
import { MatchingTable } from "../MatchingTable";
import { getMatchingTableRows } from "./MatchingTableImpl";
import { isBooleanArray, isNumberArray, isStringArray } from "../../utils/helper-functions";

export function mergeNetSummary(fromNetworks: IdType[], networkAttributeMapping: MatchingTable, netSummaries: Record<IdType, NdexNetworkSummary>) {
    // Version and Description: only preserve the base network's information
    const baseNetworkId = fromNetworks[0]
    const mergedVersion: string = netSummaries[baseNetworkId]?.version || ''
    const mergedDescription: string = netSummaries[baseNetworkId]?.description || ''
    const mergedProperties: Record<string, NdexNetworkProperty> = {}
    const flattenedProperties: NdexNetworkProperty[] = []
    const matchingTableRows = getMatchingTableRows(networkAttributeMapping)
    matchingTableRows.slice(3).forEach((row) => {
        for (const netId of fromNetworks) {
            if (row.nameRecord.hasOwnProperty(netId) && row.nameRecord[netId] !== 'None' && row.nameRecord[netId] !== '') {
                const oriProptName = row.nameRecord[netId]
                const oriPropt = netSummaries[netId]?.properties.find((property) => property.predicateString === oriProptName)
                if (!mergedProperties[`${row.id}`] && oriPropt) {
                    mergedProperties[`${row.id}`] = mergeProperty(row.mergedNetwork, cloneDeep(oriPropt))
                } else if (oriPropt) {
                    mergedProperties[`${row.id}`] = mergeProperty(row.mergedNetwork, cloneDeep(mergedProperties[`${row.id}`]), cloneDeep(oriPropt))
                }
            }
        }
    })
    for (const key in mergedProperties) {
        flattenedProperties.push(mergedProperties[key])
    }

    return {
        mergedVersion,
        mergedDescription,
        flattenedProperties,
    }
}

function mergeProperty(mergedAttName: string, propt1: NdexNetworkProperty, propt2?: NdexNetworkProperty): NdexNetworkProperty {
    propt1.predicateString = mergedAttName;
    if (!propt2) return propt1;
    if (propt1.dataType === propt2.dataType) {
        let value1 = propt1.value;
        let value2 = propt2.value;

        // If the values are string representations of arrays, parse them
        if (typeof value1 === 'string' && value1.startsWith('[') && value1.endsWith(']')) {
            try {
                value1 = JSON.parse(value1);
            } catch (e) {
                console.error("Error parsing value1 as JSON array:", value1);
            }
        }
        if (typeof value2 === 'string' && value2.startsWith('[') && value2.endsWith(']')) {
            try {
                value2 = JSON.parse(value2);
            } catch (e) {
                console.error("Error parsing value2 as JSON array:", value2);
            }
        }

        if (Array.isArray(value1) && Array.isArray(value2)) { // if both properties are list type
            if (isStringArray(value1) && isStringArray(value2)) {
                if (JSON.stringify(value1) !== JSON.stringify(value2)) {
                    propt1.value = [...new Set([...value1, ...value2])] as string[];
                }
            } else if (isNumberArray(value1) && isNumberArray(value2)) {
                if (JSON.stringify(value1) !== JSON.stringify(value2)) {
                    propt1.value = [...new Set([...value1, ...value2])] as number[];
                }
            } else if (isBooleanArray(value1) && isBooleanArray(value2)) {
                if (JSON.stringify(value1) !== JSON.stringify(value2)) {
                    propt1.value = [...new Set([...value1, ...value2])] as boolean[];
                }
            } else {
                throw new Error('Mismatched array types');
            }
        }
        propt1.value = propt1.value ?? propt2.value;
        propt1.subNetworkId = propt1.subNetworkId ?? propt2.subNetworkId;
    }
    //Todo: type coercion
    return propt1;
}