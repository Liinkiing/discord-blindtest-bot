export const normalize = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[,|-|:|.|?|!|']/g, '')
    .replace(/\s\s+/g, ' ')
    .trim()
    .toLowerCase()

export const getMedal = (position: number): string => {
  switch (position) {
    case 0:
      return '🥇 '
    case 1:
      return '🥈 '
    case 2:
      return '🥉 '
    default:
      return ''
  }
}
