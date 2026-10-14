import {
  CompositeFilterNode,
  FilterNode,
  FilterPredicate,
  FilterTypeId,
  MatchType,
} from '../../FilterTree'

/**
 * Turning a "hide …" filter into the show-mode filter that keeps everything
 * else visible (docs/specifications/LLM_FILTER_GENERATION_SPEC.md, "Display
 * mode"). The filter model has no NOT, so each condition is replaced by its
 * opposite and groups by De Morgan's laws.
 */

// Pairs of predicates whose results are each other's opposite for every
// value, missing values included (FILTER_SPECIFICATION.md, "Predicates")
const OPPOSITE: Partial<Record<FilterPredicate, FilterPredicate>> = {
  [FilterPredicate.IS]: FilterPredicate.IS_NOT,
  [FilterPredicate.IS_NOT]: FilterPredicate.IS,
  [FilterPredicate.CONTAINS]: FilterPredicate.DOES_NOT_CONTAIN,
  [FilterPredicate.DOES_NOT_CONTAIN]: FilterPredicate.CONTAINS,
  [FilterPredicate.BETWEEN]: FilterPredicate.IS_NOT_BETWEEN,
  [FilterPredicate.IS_NOT_BETWEEN]: FilterPredicate.BETWEEN,
}

// Topology conditions compare a count, which is never missing
const OPPOSITE_COUNT: Partial<Record<FilterPredicate, FilterPredicate>> = {
  [FilterPredicate.GREATER_THAN_OR_EQUAL]: FilterPredicate.LESS_THAN,
  [FilterPredicate.LESS_THAN]: FilterPredicate.GREATER_THAN_OR_EQUAL,
}

const flipMatch = (matchType: MatchType): MatchType =>
  matchType === MatchType.ALL ? MatchType.ANY : MatchType.ALL

const negateNode = (node: FilterNode): FilterNode | undefined => {
  switch (node.type) {
    case FilterTypeId.Composite: {
      const children: FilterNode[] = []
      for (const child of node.children) {
        const negated = negateNode(child)
        if (negated === undefined) return undefined
        children.push(negated)
      }
      return { ...node, matchType: flipMatch(node.matchType), children }
    }
    case FilterTypeId.Column: {
      // A boolean column ignores the predicate: flip the value instead
      if (typeof node.criterion === 'boolean') {
        return { ...node, criterion: !node.criterion }
      }
      const predicate =
        node.predicate === null ? undefined : OPPOSITE[node.predicate]
      if (predicate === undefined) return undefined
      // Not "any element passes" is "every element fails", and the other
      // way round. Scalar columns ignore anyMatch.
      return { ...node, predicate, anyMatch: !node.anyMatch }
    }
    case FilterTypeId.Degree: {
      const predicate =
        node.predicate === null ? undefined : OPPOSITE[node.predicate]
      return predicate === undefined ? undefined : { ...node, predicate }
    }
    case FilterTypeId.Topology: {
      // The neighbour conditions say which neighbours count; only the
      // comparison of the count turns around
      const predicate =
        node.predicate === null ? undefined : OPPOSITE_COUNT[node.predicate]
      return predicate === undefined ? undefined : { ...node, predicate }
    }
    default:
      return undefined
  }
}

/**
 * The filter that keeps visible exactly the elements `root` does not pass,
 * for conditions the generation policy accepts. Two documented exceptions:
 * an element with no value in a boolean column, and one with no list in a
 * list column, fails both a condition and its opposite.
 *
 * @returns The negated filter, or undefined when a condition has no opposite
 *   (a predicate the generation policy refuses, such as REGEX)
 */
export const negateForHide = (
  root: CompositeFilterNode,
): CompositeFilterNode | undefined => {
  const negated = negateNode(root)
  return negated?.type === FilterTypeId.Composite ? negated : undefined
}
