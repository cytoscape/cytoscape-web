export const JAVA_LOGICAL_FONT_FAMILY_LIST = [
  'Dialog',
  'DialogInput',
  'Monospaced',
  'Serif',
  'SansSerif',
]

export const JAVA_LOGICAL_FONT_PROPERTIES_MAP = {
  plain: {},
  bold: { 'font-weight': 'bold' },
  bolditalic: { 'font-weight': 'bold', 'font-style': 'italic' },
  italic: { 'font-style': 'italic' },
}

export const JAVA_LOGICAL_FONT_STACK_MAP = {
  //Java Logical Font stack
  //The following are Java logical fonts.
  //https://docs.oracle.com/javase/tutorial/2d/text/fonts.html#logical-fonts

  //Dialog
  Dialog:
    'Segoe UI,Frutiger,Frutiger Linotype,Dejavu Sans,Helvetica Neue,Arial,sans-serif',
  DialogInput:
    'Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace',
  Monospaced: 'Consolas,monaco,monospace',
  Serif: 'TimesNewRoman,Times New Roman,Times,Baskerville,Georgia,serif',
  SansSerif: 'Arial,Helvetica Neue,Helvetica,sans-serif',
}
