export const Visibility = {
    PUBLIC: 'PUBLIC',
    PRIVATE:'PRIVATE',
    LOCAL:'LOCAL',
}
export type Visibility = typeof Visibility[keyof typeof Visibility]
