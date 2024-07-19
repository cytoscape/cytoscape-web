// Network Naming Utilities
export function generateUniqueName(existingNames: string[] | Set<string>, proposedName: string): string {
    if (existingNames instanceof Set) {
        if (!existingNames.has(proposedName)) {
            return proposedName;
        } else {
            let i = 1;
            while (existingNames.has(proposedName + '_' + i)) {
                i++;
            }
            return proposedName + '_' + i;
        }
    } else {
        if (!existingNames.includes(proposedName)) {
            return proposedName;
        } else {
            let i = 1;
            while (existingNames.includes(proposedName + '_' + i)) {
                i++;
            }
            return proposedName + '_' + i;
        }
    }
}
