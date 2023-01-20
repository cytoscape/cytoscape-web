
export interface CustomParameters {
    name: string
    displayName: string
    description: string
    type: "value" | "flag"
    defaultValue?: string
    validationType?: string
    validationHelp?: string
    validationRegex?: string
    minValue?: number
    maxValue?: number
}

export interface AlgorithmEntry {
    name: string
    displayName: string
    description: string
    version: string
    dockerImage: string
    inputDataFormat: string
    outputDataFormat: string
    customParameters: CustomParameters[]
}
