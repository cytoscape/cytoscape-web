import { StyledInputBase } from './StyledInputBase'
import { Search } from './Search'
import { useState } from 'react'
import { SearchControls } from './SearchControls'

export const SearchBox = (): JSX.Element => {
  const [searchTerm, setSearchTerm] = useState<string>('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value)
    console.log('SEARCH TERM', searchTerm)
  }

  return (
    <Search>
      <StyledInputBase
        placeholder="Search current network"
        inputProps={{ 'aria-label': 'search' }}
        value={searchTerm}
        onChange={handleChange}
      />
      <SearchControls searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
    </Search>
  )
}
