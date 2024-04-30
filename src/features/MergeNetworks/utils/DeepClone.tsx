// Utility function for deep cloning objects that may contain arrays, maps, and functions
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Map) {
        // Create a new Map by iterating over the original one and cloning the keys and values
        return new Map(Array.from(obj.entries()).map(([key, value]) =>
            [key, deepClone(value)])) as unknown as T;
    }

    if (obj instanceof Function) {
        // Clone the function
        return ((...args: any[]) => (obj as Function)(...args)) as unknown as T;
    }

    if (obj instanceof Array) {
        // Clone the array
        return obj.map((item) => deepClone(item)) as unknown as T;
    }

    if (obj instanceof Object) {
        // Clone the object
        const cloneO = {} as T;
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                (cloneO as any)[key] = deepClone((obj as any)[key]);
            }
        }
        return cloneO;
    }

    throw new Error('Unable to copy object!');
}