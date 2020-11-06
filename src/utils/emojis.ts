import { Guild, GuildEmoji } from 'discord.js'

export const getEmoji = (name: string, guild?: Guild | null): GuildEmoji | '' =>
  guild?.emojis.cache.find(e => e.name === name) ?? ''

export const autoProvideEmojis = (
  guild?: Guild | null
): Record<string, GuildEmoji | ''> => {
  const emojis = [
    'sanic',
    'jpec',
    'qatari',
    'elizabeth',
    'nezuko',
    'rem',
    'jul',
    'mage_noir',
    'eco',
    'pole_emploi',
    'typescript',
    'giletjaune',
    'ij',
    'rsa',
    'issoujuif',
    'caf',
    'hap',
    'gange',
    'sourirejvc',
    'kaori',
    'dozo',
    'raphtalia',
    'theo',
    'illuminati',
    'sulk',
    'oopsie',
    'issou',
    'agui',
    '5367_among_us_pink',
  ]

  return emojis.reduce(
    (previousValue, currentValue) => ({
      ...previousValue,
      [currentValue]: getEmoji(currentValue, guild),
    }),
    {}
  )
}
