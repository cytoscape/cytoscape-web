import { Box, TextField, Typography, Button, FormControlLabel, Checkbox } from '@mui/material'
import { useState, useEffect, ChangeEvent } from 'react'
import { useLockNodeSizeStore } from '../../../store/LockNodeSizeStore'
import { serializedStringIsValid } from '../../../models/TableModel/impl/ValueTypeImpl'
import { ValueTypeName } from '../../../models/TableModel'

export function SizeInput(props: {
    currentValue: number | null
    onValueChange: (value: number) => void
}): React.ReactElement {
    const { onValueChange, currentValue } = props
    const [value, setValue] = useState(String(currentValue ?? 0))
    const strValueIsValid = (value: string): boolean => {
        return serializedStringIsValid(ValueTypeName.Integer, value) || serializedStringIsValid(ValueTypeName.Double, value) || serializedStringIsValid(ValueTypeName.Long, value)

    }
    const [isValid, setValueIsValid] = useState(strValueIsValid(value))
    const setLockNodeSize = useLockNodeSizeStore(store => store.setLockState)

    useEffect(() => {
        setValue(String(currentValue ?? 0))
    }, [currentValue])

    const handleToggle = (event: ChangeEvent<HTMLInputElement>): void => {
        const isChecked: boolean = event.target.checked
        setLockNodeSize(isChecked)
    }

    return (
        <Box>
            <TextField
                value={value}
                error={!isValid}
                onChange={(e) => {
                    setValue(e.target.value)
                    setValueIsValid(strValueIsValid(e.target.value))
                }}
            >
                <Typography variant="h6">{value}</Typography>
            </TextField>
            <FormControlLabel
                control={<Checkbox
                    checked={false}
                    onChange={handleToggle}
                    name="lockNodeSize"
                    color="primary"
                />}
                label="Lock node width and height"
            />
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Button
                    color="error"
                    onClick={() => setValue(String(currentValue ?? 0))}
                >
                    Cancel
                </Button>
                <Button
                    disabled={!isValid}
                    onClick={() => {
                        const nextValue = Number(Number(value).toFixed(4))
                        if (!isNaN(nextValue)) {
                            onValueChange(nextValue)
                        }
                    }}
                >
                    Confirm
                </Button>
            </Box>
        </Box>
    )
}

export function SizeRender(props: { value: number }): React.ReactElement {
    const { value } = props
    let displayValue = value ?? 0

    displayValue =
        displayValue.toFixed != null
            ? Number(displayValue.toFixed(0))
            : displayValue
    return (
        <Box>
            <Typography sx={{ fontSize: 14 }} variant="body1">
                {displayValue}
            </Typography>
        </Box>
    )
}
