export const normalize = (str: string) =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(',', '')
    .replace('-', ' ')
    .replace(':', '')
    .trim()
    .toLowerCase()
