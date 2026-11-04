import { DiscreteFilterValue, FilterConfig } from '@/models/FilterModel'
import { DiscreteRange } from '@/models/PropertyModel/DiscreteRange'

interface FilterWidgetProps {
  config: FilterConfig
  colors: Map<DiscreteFilterValue, string>
  enabled: boolean
  checked: readonly DiscreteFilterValue[]
  onEnabledChange: (enabled: boolean) => void
  onCheckedChange: (checked: DiscreteFilterValue[]) => void
}

const optionKey = (value: DiscreteFilterValue): string =>
  `${typeof value}:${String(value)}`

/**
 * The subsystem's checkbox filter, from its `filterWidgets` aspect: an
 * on/off switch, select all, and one checkbox per value with the colour the
 * visual style maps it to. Labels come from the aspect's descriptions.
 */
export const FilterWidget = ({
  config,
  colors,
  enabled,
  checked,
  onEnabledChange,
  onCheckedChange,
}: FilterWidgetProps) => {
  const allValues = (config.range as DiscreteRange<DiscreteFilterValue>).values
  const labels = new Map(
    (config.discreteFilterDetails ?? []).map((d) => [
      d.criterion,
      d.description,
    ]),
  )
  const checkedSet = new Set(checked)
  const allChecked = allValues.every((v) => checkedSet.has(v))

  const toggle = (value: DiscreteFilterValue): void =>
    onCheckedChange(
      checkedSet.has(value)
        ? checked.filter((v) => v !== value)
        : [...checked, value],
    )

  return (
    <div className="embed-paper embed-filter" data-testid="embed-filter">
      <label className="embed-filter-header">
        <input
          type="checkbox"
          data-testid="embed-filter-enabled"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        <span>{config.label}</span>
      </label>
      <label className="embed-filter-option">
        <input
          type="checkbox"
          disabled={!enabled}
          checked={allChecked}
          onChange={(e) =>
            onCheckedChange(e.target.checked ? [...allValues] : [])
          }
        />
        <span>{allChecked ? 'Deselect all' : 'Select all'}</span>
      </label>
      {allValues.map((value) => (
        <label key={optionKey(value)} className="embed-filter-option">
          <input
            type="checkbox"
            data-testid={`embed-filter-option-${String(value)}`}
            disabled={!enabled}
            checked={checkedSet.has(value)}
            onChange={() => toggle(value)}
          />
          <span
            className="embed-filter-swatch"
            style={{ background: colors.get(value) ?? 'transparent' }}
          />
          <span>
            {value === null
              ? '(no value)'
              : (labels.get(String(value)) ?? String(value))}
          </span>
        </label>
      ))}
    </div>
  )
}
