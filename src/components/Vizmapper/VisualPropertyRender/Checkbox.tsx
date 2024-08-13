import React from 'react';
import { Checkbox, FormControlLabel } from '@mui/material';
import { IdType } from '../../../models/IdType';
import { useUiStateStore } from '../../../store/UiStateStore';
import { EdgeVisualPropertyName } from '../../../models/VisualStyleModel';

export const LockSizeCheckbox = (props: {
    currentNetworkId: IdType,
}) => {
    const { currentNetworkId } = props;
    const nodeSizeLocked = useUiStateStore(state => state.ui.visualStyleOptions[currentNetworkId]?.visualEditorProperties.nodeSizeLocked);
    const setNodeSizeLocked = useUiStateStore((state) => state.setNodeSizeLocked)
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newStatus = event.target.checked;
        setNodeSizeLocked(currentNetworkId, newStatus)
    };

    return (
        <FormControlLabel
            control={
                <Checkbox
                    checked={nodeSizeLocked}
                    onChange={handleChange}
                    color="primary"
                />
            }
            label="Lock node width and height"
        />
    );
};

export const LockColorCheckbox = (props: {
    currentNetworkId: IdType,
}) => {
    const { currentNetworkId } = props;
    const arrowColorMatchesEdge = useUiStateStore(state => state.ui.visualStyleOptions[currentNetworkId]?.visualEditorProperties.arrowColorMatchesEdge);
    const setArrowColorMatchesEdge = useUiStateStore((state) => state.setArrowColorMatchesEdge)
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newStatus = event.target.checked;
        setArrowColorMatchesEdge(currentNetworkId, newStatus);
    };

    return (
        <FormControlLabel
            control={
                <Checkbox
                    checked={arrowColorMatchesEdge}
                    onChange={handleChange}
                    color="primary"
                />
            }
            label="Edge color to arrows"
        />
    );
};