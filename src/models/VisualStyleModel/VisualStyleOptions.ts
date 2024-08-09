export enum nodeSizeLockedType {
    WIDTHLOCKED = 'widthLocked',
    HEIGHTLOCKED = 'heightLocked',
    NONE = 'none'
}

export enum arrowColorMatchesEdgeType {
    SRCARRCOLOR = 'srcArrColor',
    TGTARRCOLOR = 'tgtArrColor',
    LINECOLOR = 'lineColor',
    NONE = 'none'
}

export interface VisualEditorProperties {
    nodeSizeLocked: nodeSizeLockedType
    arrowColorMatchesEdge: arrowColorMatchesEdgeType
}

export type VisualStyleOptions = {
    visualEditorProperties: VisualEditorProperties
}