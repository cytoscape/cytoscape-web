import React from 'react';
import { Checkbox, FormControlLabel } from '@mui/material';
import { IdType } from '../../../models/IdType';
import { useUiStateStore } from '../../../store/UiStateStore';
import { arrowColorMatchesEdgeType, nodeSizeLockedType } from '../../../models/VisualStyleModel/VisualStyleOptions';
import { Ui } from '../../../models/UiModel';
import { EdgeVisualPropertyName, EdgeVisualPropertyNames } from '../../../models/VisualStyleModel';
import { use } from 'cytoscape';

export const LockSizeCheckbox = (props: {
    isHeight: boolean,
    currentNetworkId: IdType,
}) => {
    const { isHeight, currentNetworkId } = props;
    const nodeSizeLocked = useUiStateStore(state => state.ui.visualStyleOptions[currentNetworkId]?.visualEditorProperties.nodeSizeLocked);
    const isChecked = nodeSizeLocked === nodeSizeLockedType.HEIGHTLOCKED || nodeSizeLocked === nodeSizeLockedType.WIDTHLOCKED
    const setNodeSizeLocked = useUiStateStore((state) => state.setNodeSizeLocked)
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newStatus = event.target.checked;
        if (newStatus) {
            const lockedType = isHeight ? nodeSizeLockedType.WIDTHLOCKED : nodeSizeLockedType.HEIGHTLOCKED;
            setNodeSizeLocked(currentNetworkId, lockedType);
        } else {
            setNodeSizeLocked(currentNetworkId, nodeSizeLockedType.NONE);
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

export const LockColorCheckbox = (props: {
    vpName: string,
    currentNetworkId: IdType,
}) => {
    const lockStateMap: Record<string, arrowColorMatchesEdgeType> = {
        [EdgeVisualPropertyNames.edgeSourceArrowColor]: arrowColorMatchesEdgeType.SRCARRCOLOR,
        [EdgeVisualPropertyNames.edgeTargetArrowColor]: arrowColorMatchesEdgeType.TGTARRCOLOR,
        [EdgeVisualPropertyNames.edgeLineColor]: arrowColorMatchesEdgeType.LINECOLOR,
    }
    const { currentNetworkId } = props;
    const arrowColorMatchesEdge = useUiStateStore(state => state.ui.visualStyleOptions[currentNetworkId]?.visualEditorProperties.arrowColorMatchesEdge);
    const isChecked = arrowColorMatchesEdge === arrowColorMatchesEdgeType.SRCARRCOLOR || arrowColorMatchesEdge === arrowColorMatchesEdgeType.TGTARRCOLOR || arrowColorMatchesEdge === arrowColorMatchesEdgeType.LINECOLOR
    const setArrowColorMatchesEdge = useUiStateStore((state) => state.setArrowColorMatchesEdge)
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newStatus = event.target.checked;
        if (newStatus) {
            const lockedType = lockStateMap[props.vpName];
            setArrowColorMatchesEdge(currentNetworkId, lockedType ?? arrowColorMatchesEdgeType.NONE);
        } else {
            setArrowColorMatchesEdge(currentNetworkId, arrowColorMatchesEdgeType.NONE);
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
            label="Edge color to arrows"
        />
    );
};