import Papa from 'papaparse'

describe('File Delimiter Parsing', () => {
  it('parses comma-delimited file correctly', () => {
    const text = 'col1,col2,col3\nval1,val2,val3\nval4,val5,val6'
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
    })

    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual({ col1: 'val1', col2: 'val2', col3: 'val3' })
    expect(result.data[1]).toEqual({ col1: 'val4', col2: 'val5', col3: 'val6' })
  })

  it('parses semicolon-delimited file correctly', () => {
    const text = 'col1;col2;col3\nval1;val2;val3\nval4;val5;val6'
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';',
    })

    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual({ col1: 'val1', col2: 'val2', col3: 'val3' })
    expect(result.data[1]).toEqual({ col1: 'val4', col2: 'val5', col3: 'val6' })
  })

  it('parses pipe-delimited file correctly', () => {
    const text = 'col1|col2|col3\nval1|val2|val3\nval4|val5|val6'
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: '|',
    })

    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual({ col1: 'val1', col2: 'val2', col3: 'val3' })
    expect(result.data[1]).toEqual({ col1: 'val4', col2: 'val5', col3: 'val6' })
  })

  it('parses tab-delimited file correctly', () => {
    const text = 'col1\tcol2\tcol3\nval1\tval2\tval3\nval4\tval5\tval6'
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: '\t',
    })

    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual({ col1: 'val1', col2: 'val2', col3: 'val3' })
    expect(result.data[1]).toEqual({ col1: 'val4', col2: 'val5', col3: 'val6' })
  })

  it('parses space-delimited file correctly', () => {
    const text = 'col1 col2 col3\nval1 val2 val3\nval4 val5 val6'
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: ' ',
    })

    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual({ col1: 'val1', col2: 'val2', col3: 'val3' })
    expect(result.data[1]).toEqual({ col1: 'val4', col2: 'val5', col3: 'val6' })
  })

  it('parses custom delimiter correctly', () => {
    const text = 'col1:col2:col3\nval1:val2:val3\nval4:val5:val6'
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: ':',
    })

    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual({ col1: 'val1', col2: 'val2', col3: 'val3' })
    expect(result.data[1]).toEqual({ col1: 'val4', col2: 'val5', col3: 'val6' })
  })

  it('auto-detects delimiter when undefined', () => {
    const text = 'col1,col2,col3\nval1,val2,val3\nval4,val5,val6'
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    })

    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual({ col1: 'val1', col2: 'val2', col3: 'val3' })
    expect(result.data[1]).toEqual({ col1: 'val4', col2: 'val5', col3: 'val6' })
  })

  it('handles incorrect delimiter gracefully', () => {
    const text = 'col1,col2,col3\nval1,val2,val3'
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';',
    })

    // When delimiter is wrong, Papa.parse treats the whole line as one column
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toHaveProperty('col1,col2,col3')
  })
})

