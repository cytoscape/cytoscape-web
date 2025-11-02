import { Rectangle } from '@glideapps/glide-data-grid';
import React, {
  useMemo,
  useRef
} from 'react';
import { usePopper } from 'react-popper';

import { Box } from '@mui/material';
interface TableBrowserContextMenuProps {
  bounds: Rectangle,
  children: React.ReactNode
}

export default function TableBrowserContextMenu(props: TableBrowserContextMenuProps): React.ReactElement {
  const { bounds } = props;
  const popperReference = useRef(null);
  const virtualReference = useMemo(
    () => ({
      getBoundingClientRect() {
        return {
          left: bounds?.x ?? 0,
          top: bounds?.y ?? 0,
          width: bounds?.width ?? 0,
          height: bounds?.height ?? 0,
          right: (bounds?.x ?? 0) + (bounds?.width ?? 0),
          bottom: (bounds?.y ?? 0) + (bounds?.height ?? 0),
          x: bounds?.x ?? 0,
          y: bounds?.y ?? 0,
          toJSON: () => { }

        };
      },
    }),
    [bounds],
  );

  const { styles, attributes } = usePopper(virtualReference, popperReference.current, {
    placement: 'bottom',
  });

  return (
    <div ref={popperReference} style={styles.popper}
      {...attributes.popper}
      {...props}>
      <Box sx={{ display: bounds == null ? 'none' : 'element' }}>
        {props.children}
      </Box>
    </div>
  );
}