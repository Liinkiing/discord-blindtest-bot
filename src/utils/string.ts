export const normalize = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[,|-|:|.|?|!|']/g, '')
    .replace(/\s\s+/g, ' ')
    .trim()
    .toLowerCase()
