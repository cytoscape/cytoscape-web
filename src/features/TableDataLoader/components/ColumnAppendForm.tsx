import { Button, Tooltip } from '@mantine/core';
import { ColumnAppendType, columnAppendType2Label } from '../models/AppendTableToNetwork';
import { IconBan, IconFileText, IconKey } from '@tabler/icons-react';

export const columnAppendIconMap = {
  [ColumnAppendType.Key]: <IconKey height={20} width={30} color="rgba(41, 2, 2, 1)" />,
  [ColumnAppendType.Attribute]: <IconFileText height={20} width={30} color="rgba(41, 2, 2, 1)" />,
  [ColumnAppendType.NotImported]: <IconBan size={20} color="gray" />,
};

export function ColumnAppendTypeRender(props: { value: ColumnAppendType }) {
  return (
    <Button
      justify="flex-start"
      size="compact-xs"
      leftSection={columnAppendIconMap[props.value]}
      variant="default"
    >
      {columnAppendType2Label[props.value]}
    </Button>
  );
}

export interface ColumnAppendFormProps {
  value: ColumnAppendType;
  onChange: (nextValue: ColumnAppendType) => void;
  validValues: ColumnAppendType[];
}

export function ColumnAppendForm(props: ColumnAppendFormProps) {
  const { value, onChange, validValues } = props;

  return (
    <Button.Group>
      {Object.values(ColumnAppendType).map((v) => {
        return (
          <Tooltip key={v} label={columnAppendType2Label[v]}>
            <Button
              style={{ opacity: !validValues.includes(v) ? 0.2 : 1 }}
              disabled={!validValues.includes(v)}
              onClick={() => onChange(v)}
              bg={v === value ? '#D6D6D6' : 'white'}
              justify="flex-start"
              size="compact-xs"
              leftSection={columnAppendIconMap[v]}
              variant="default"
            ></Button>
          </Tooltip>
        );
      })}
    </Button.Group>
  );
}
