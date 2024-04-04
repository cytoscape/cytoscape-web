export const FilterUrlParams = {
  FILTER_FOR: 'filterFor',
  FILTER_BY: 'filterBy',
  FILTER_RANGE: 'filterRange',
} as const

export type FilterUrlParams =
  (typeof FilterUrlParams)[keyof typeof FilterUrlParams]
