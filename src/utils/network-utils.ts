// Network Naming Utilities
export function generateUniqueName(existingNames: string[], proposedName: string): string {
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
