import React from 'react';
import { Checkbox, FormControlLabel } from '@mui/material';
import { LockedDimension, useLockNodeSizeStore } from '../../../store/LockNodeSizeStore';

export const LockSizeCheckbox = (props: {
    isHeight: boolean,
    syncValue: (value: number) => void,
    size?: number
}) => {
    const { isHeight, size, syncValue } = props;
    const isChecked = useLockNodeSizeStore(state => state.isLocked);
    const toggleLockState = useLockNodeSizeStore(state => state.toggleLockState);
    const setLockDimension = useLockNodeSizeStore(state => state.setLockDimension);
    const setSharedSize = useLockNodeSizeStore(state => state.setSize);
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newStatus = event.target.checked;
        toggleLockState(newStatus);
        if (newStatus) {
            setLockDimension(isHeight ? LockedDimension.width : LockedDimension.height);
            if (size) {
                syncValue(size);
            }
        } else {
            setLockDimension(LockedDimension.none);
        }
    };

    return (
        <FormControlLabel
            control={
                <Checkbox
                    checked={isChecked}
                    onChange={handleChange}
                    color="primary"
                />
            }
            label="Lock node width and height"
        />
    );
};
