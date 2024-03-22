import {
  Autocomplete,
  Box,
  Button,
  Group,
  Select,
  Space,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { ValueTypeName } from '../../../models/TableModel'
import { DelimiterType } from '../model/DelimiterType'
import { valueTypeName2Label } from '../model/impl/CreateNetworkFromTable'

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
              <Tooltip key={v} label={valueTypeName2Label[v]}>
                <Button
                  style={{ opacity: !validValues.includes(v) ? 0.2 : 1 }}
                  disabled={!validValues.includes(v)}
                  onClick={() => onChange(v)}
                  bg={v === value ? '#D6D6D6' : 'white'}
                  justify="flex-start"
                  size="compact-xs"
                  leftSection={valueTypeNameRenderMap[v]}
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
              <Tooltip label={valueTypeName2Label[v]}>
                <Button
                  style={{ opacity: !validValues.includes(v) ? 0.2 : 1 }}
                  disabled={!validValues.includes(v)}
                  onClick={() => onChange(v, props.delimiter ?? '|')}
                  bg={v === value ? '#D6D6D6' : 'white'}
                  justify="flex-start"
                  size="compact-xs"
                  leftSection={valueTypeNameRenderMap[v]}
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
          disabled={!value.startsWith('list_')}
          size="xs"
          value={props.delimiter ?? '|'}
          onChange={(e) => props.onChange(value, e as DelimiterType)}
          label={<Text size={'xs'}>List Delimiter</Text>}
          placeholder="Select or type custom delimiter"
          data={['|', ':', '\\', '/', ',', 'space', 'tab']}
          comboboxProps={{ withinPortal: false }}
          filter={({ options, search }) => options}
        />
      </Group>
    </Box>
  )
}

export const getText = (value: string) => (
  <Text
    c="#D6D6D6"
    size="xl"
    style={{
      width: 35,
      height: 20,
      fontSize: 12,
    }}
    variant="gradient"
    gradient={{ from: 'rgba(41, 2, 2, 1)', to: 'gray', deg: 222 }}
    fw={900}
  >
    {value}
  </Text>
)

export const valueTypeNameRenderMap = {
  [ValueTypeName.Boolean]: getText('y/n'),
  [ValueTypeName.Integer]: getText('1'),
  [ValueTypeName.Double]: getText('1.0'),
  [ValueTypeName.Long]: getText('123'),
  [ValueTypeName.String]: getText('ab'),
  [ValueTypeName.ListBoolean]: getText('[y/n]'),
  [ValueTypeName.ListDouble]: getText('[1.0]'),
  [ValueTypeName.ListInteger]: getText('[1]'),
  [ValueTypeName.ListLong]: getText('[123]'),
  [ValueTypeName.ListString]: getText('[ab]'),
}

export function ValueTypeNameRenderCompact(props: { value: ValueTypeName }) {
  return (
    <Tooltip label={valueTypeName2Label[props.value]}>
      <Button
        justify="flex-start"
        size="compact-xs"
        leftSection={valueTypeNameRenderMap[props.value]}
        variant="default"
      ></Button>
    </Tooltip>
  )
}

export function ValueTypeNameRender(props: { value: ValueTypeName }) {
  return (
    <Button
      justify="flex-start"
      size="compact-xs"
      leftSection={valueTypeNameRenderMap[props.value]}
      variant="default"
    >
      {valueTypeName2Label[props.value]}
    </Button>
  )
}
