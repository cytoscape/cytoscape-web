import { TextInput } from '@mantine/core'
import { useCreateNetworkFromTableStore } from '../../store/createNetworkFromTableStore'
import { useState } from 'react'
import { debounce } from 'lodash'

export const NetworkNameInput = () => {
  const name = useCreateNetworkFromTableStore((state) => state.name)
  const setName = useCreateNetworkFromTableStore((state) => state.setName)

  const [value, setValue] = useState(name)

  const updateName = debounce((value: string) => {
    setName(value)
  }, 500)

  return (
    <TextInput
      value={value}
      onChange={(event) => {
        setValue(event.currentTarget.value)
        updateName(event.currentTarget.value)
      }}
      label="Network name"
    />
  )
}
