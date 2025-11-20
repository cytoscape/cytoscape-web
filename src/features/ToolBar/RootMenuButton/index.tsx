import { Button } from '@mui/material'

interface RootMenuButtonProps {
  handleClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  open: boolean
  label: string
}
export const RootMenuButton = ({
  handleClick,
  open,
  label,
}: RootMenuButtonProps): JSX.Element => {
  return (
    <Button
      sx={{
        color: 'white',
        textTransform: 'none',
      }}
      id={label}
      aria-controls={open ? 'basic-menu' : undefined}
      aria-haspopup="true"
      aria-expanded={open ? 'true' : undefined}
      onClick={handleClick}
    >
      {label}
    </Button>
  )
}
