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
    const uiState = useUiStateStore(state => state.ui);
    const setUi = useUiStateStore(state => state.setUi);
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newStatus = event.target.checked;
        const newUi = {
            ...uiState,
            visualStyleOptions: {
                ...uiState.visualStyleOptions,
                [currentNetworkId]: {
                    ...uiState.visualStyleOptions[currentNetworkId],
                    visualEditorProperties: {
                        nodeSizeLocked: newStatus,
                        arrowColorMatchesEdge: uiState.visualStyleOptions[currentNetworkId]?.visualEditorProperties.arrowColorMatchesEdge ?? false
                    }
                }
            }
        }
        setUi(newUi)
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
    const uiState = useUiStateStore(state => state.ui);
    const setUi = useUiStateStore(state => state.setUi);
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newStatus = event.target.checked;
        const newUi = {
            ...uiState,
            visualStyleOptions: {
                ...uiState.visualStyleOptions,
                [currentNetworkId]: {
                    ...uiState.visualStyleOptions[currentNetworkId],
                    visualEditorProperties: {
                        nodeSizeLocked: uiState.visualStyleOptions[currentNetworkId]?.visualEditorProperties.nodeSizeLocked ?? false,
                        arrowColorMatchesEdge: newStatus
                    }
                }
            }
        }
        setUi(newUi);
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