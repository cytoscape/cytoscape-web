import React, { ReactElement } from 'react';
import { MenuItem } from '@mui/material';
import { BaseMenuProps } from '../../../components/ToolBar/BaseMenuProps';

export const ExampleTwoMenuItem = ({ handleClose }: BaseMenuProps ): ReactElement => {
    const handleClick = (): void => {
        alert('This is a demo of adding a menu item');
        handleClose();
    };

    return (
    <MenuItem onClick={handleClick}>
      Example 2
    </MenuItem>
  );
};
