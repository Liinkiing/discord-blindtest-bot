export const normalize = (
  str: string,
  options?: { split: boolean }
): string => {
  let result = str
  if (options?.split) {
    result = str.split('-')[0]
  }
  return result
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[,|-|:|.|?|!|']/g, '')
    .replace(/\s\s+/g, ' ')
    .replace(/\([^()]*\)/g, '')
    .replace(/\[.*?]/g, '')
    .trim()
    .toLowerCase()
}

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
