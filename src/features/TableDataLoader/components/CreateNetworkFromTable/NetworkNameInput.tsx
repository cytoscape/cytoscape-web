import { TextField } from '@mui/material'
import debounce from 'lodash/debounce'
import { useState } from 'react'

import { useCreateNetworkFromTableStore } from '../../store/createNetworkFromTableStore'

export const NetworkNameInput = () => {
  const name = useCreateNetworkFromTableStore((state) => state.name)
  const setName = useCreateNetworkFromTableStore((state) => state.setName)

  const [value, setValue] = useState(name)

  const updateName = debounce((value: string) => {
    setName(value)
  }, 500)

  return (
    <TextField
      data-testid="create-network-from-table-name-input"
      size="small"
      value={value}
      onChange={(event) => {
        setValue(event.currentTarget.value)
        updateName(event.currentTarget.value)
      }}
      label="Network name"
    />
  )
}
