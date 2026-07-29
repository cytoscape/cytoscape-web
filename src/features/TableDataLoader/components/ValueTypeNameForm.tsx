import {
  Autocomplete,
  Box,
  Button,
  Group,
  Space,
  Text,
  Tooltip,
} from '@mantine/core'

import { ValueTypeNameChip } from '../../../components/ValueTypeNameChip'
import { ValueTypeName } from '../../../models/TableModel'
import { DelimiterType } from '../model/DelimiterType'
import { valueTypeNameLabel as valueTypeName2Label } from '../../../models/TableModel/impl/valueTypeNameDisplay'

export interface ValueTypeFormProps {
  value: ValueTypeName
  delimiter?: DelimiterType
  onChange: (nextValue: ValueTypeName, nextDelimiter?: DelimiterType) => void
  validValues: ValueTypeName[]
}

export function ValueTypeForm(props: ValueTypeFormProps) {
  const { value, onChange, validValues } = props

  return (
    <Box>
      <Button.Group>
        {Object.values(ValueTypeName)
          .filter((x) => !x.startsWith('list_'))
          .map((v) => {
            return (
              <Tooltip zIndex={2001} key={v} label={valueTypeName2Label(v)}>
                <Button
                  style={{ opacity: !validValues.includes(v) ? 0.2 : 1 }}
                  disabled={!validValues.includes(v)}
                  onClick={() => onChange(v)}
                  bg={v === value ? '#D6D6D6' : 'white'}
                  justify="flex-start"
                  size="compact-xs"
                  leftSection={
                    <ValueTypeNameChip type={v} showTooltip={false} />
                  }
                  variant="default"
                ></Button>
              </Tooltip>
            )
          })}
      </Button.Group>
      <Space h="xl" />
      <Button.Group>
        {Object.values(ValueTypeName)
          .filter((x) => x.startsWith('list_'))
          .map((v) => {
            return (
              <Tooltip zIndex={2001} key={v} label={valueTypeName2Label(v)}>
                <Button
                  style={{ opacity: !validValues.includes(v) ? 0.2 : 1 }}
                  disabled={!validValues.includes(v)}
                  onClick={() => onChange(v, props.delimiter ?? '|')}
                  bg={v === value ? '#D6D6D6' : 'white'}
                  justify="flex-start"
                  size="compact-xs"
                  leftSection={
                    <ValueTypeNameChip type={v} showTooltip={false} />
                  }
                  variant="default"
                ></Button>
              </Tooltip>
            )
          })}
      </Button.Group>
      <Group>
        <Autocomplete
          styles={{
            input: {
              width: 250,
            },
          }}
          disabled={!value?.startsWith('list_')}
          size="xs"
          value={props.delimiter ?? '|'}
          onChange={(e) => props.onChange(value, e as DelimiterType)}
          label={<Text size={'xs'}>List Delimiter</Text>}
          placeholder="Select or type custom delimiter"
          data={['|', ':', '\\', '/', ',', 'space', 'tab']}
          comboboxProps={{ withinPortal: false }}
          filter={({ options }) => options}
        />
      </Group>
    </Box>
  )
}

/**
 * Data type badge plus its readable label, for the column header summary in
 * the import forms. The badge itself comes from the shared
 * {@link ValueTypeNameChip} so it matches the table browser headers and every
 * other data type surface (CW-562).
 */
export function ValueTypeNameRender(props: { value: ValueTypeName }) {
  return (
    <Button
      justify="flex-start"
      size="compact-xs"
      leftSection={<ValueTypeNameChip type={props.value} showTooltip={false} />}
      variant="default"
    >
      {valueTypeName2Label(props.value)}
    </Button>
  )
}
