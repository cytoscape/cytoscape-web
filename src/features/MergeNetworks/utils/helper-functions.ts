import { Pair } from "../models/DataInterfaceForMerge";

//utility function to find index of a pair in a list
export const findPairIndex = (pairs: Pair<string, string>[], uuid: string) => {
    return pairs.findIndex(pair => pair[1] === uuid);
};