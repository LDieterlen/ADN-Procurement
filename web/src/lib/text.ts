// Text matching without accents nor case, the front-end twin of the API's `normalize_key`.

const MARKS = /[̀-ͯ]/g

/** « Fauteuil Éléa » → « fauteuil elea ». */
export function fold(text: string): string {
  return text.normalize('NFKD').replace(MARKS, '').toLowerCase()
}

/** Also drops punctuation and spaces: « AM.PM » and « am pm » give the same key. */
export function foldKey(text: string): string {
  return fold(text).replace(/[^a-z0-9]/g, '')
}
