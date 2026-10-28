/**
 * Reads a file as text, rejecting when the browser cannot read it (the file
 * was moved or deleted after it was chosen, or is too large to hold as one
 * string).
 *
 * FileReader rather than `file.text()`: `readAsText` follows a UTF-16
 * byte-order mark, as in Excel's "Unicode Text" export, where `file.text()`
 * always decodes UTF-8.
 */
export const readFileAsText = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsText(file)
  })
