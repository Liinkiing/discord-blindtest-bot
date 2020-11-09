import { MessageEmbed } from 'discord.js'
import { Song } from '~/entities/song'
import { t } from '~/translations'
import { Entry } from '~/entities/leaderboard/entry'
import { getMedal } from '~/utils/string'

const spotifyColor = '#1DB954'
const botColor = '#ff0000'

export const SONG_INFO_EMBED = (song: Song): MessageEmbed =>
  new MessageEmbed()
    .setColor(spotifyColor)
    .setThumbnail('https://www.nautiljon.com/images/perso/00/82/rem_13328.jpg')
    .setImage(song.picture ?? '')
    .setTitle(song.title)
    .setURL(song.link)
    .addFields({ name: 'Artistes', value: song.artists.join(', ') })
    .setFooter(
      song.album ?? 'Album inconnu',
      'https://e7.pngegg.com/pngimages/420/432/png-clipart-spotify-logo-spotify-computer-icons-podcast-music-apps-miscellaneous-angle-thumbnail.png'
    )
    .setDescription(t('listen-on-spotify'))

export const LEADERBOARD_EMBED = (entries: Entry[]): MessageEmbed => {
  const message = new MessageEmbed()
    .setColor(botColor)
    .setThumbnail('https://img.icons8.com/bubbles/2x/leaderboard.png')
    .setTitle('**Leaderboard**')
  entries.forEach((entry, i) => {
    message.addField(
      `${getMedal(i)}**#${i + 1}**`,
      `<@${entry.userId}> - *avec **${entry.totalPoints}** point${
        entry.totalPoints > 1 ? 's' : ''
      } et **${entry.winCount}** victoire${entry.winCount > 1 ? 's' : ''}*`
    )
  })

  return message
}

export const INFO_EMBED = (): MessageEmbed =>
  new MessageEmbed()
    .setColor(botColor)
    .setTitle('**MINA, GAMBATENE**')
    .addField('!bt help', 'Affiche cette aide')
    .addField(
      '!bt create `--category | -c <CATEGORY>` `--artists | -a <ARTISTS>` `--limit | -l <LIMIT>` `--boardSong | -b <TRUE|FALSE>` `--skipArtists | -s <TRUE|FALSE>`',
      'Créér un blindtest'
    )
    .addFields(
      { name: '--category', value: 'Filtrer par catégories', inline: true },
      { name: '--artists', value: 'Filtrer par artistes', inline: true },
      {
        name: '--limit',
        value: 'Limite le nombre maximum de musiques',
        inline: true,
      },
      {
        name: '--boardSong',
        value: 'Afficher ou non le score après chaque musique',
        inline: true,
      },
      {
        name: '--skipArtists',
        value: 'Éviter ou non les artistes',
        inline: true,
      }
    )
    .addField('!bt start', 'Démarre le blindtest')
    .addField('!bt leaderboard', 'Affiche le leaderboard')
    .addField('!bt players', 'Affiche la liste des joueurs')
    .addField('!bt join', 'Rejoint un blindtest en cours')
    .addField('!bt skip', 'Lancer un vote pour passer à la prochaine musique')
    .addField('!bt delete', "Supprime un blindtest qui vient d'être créé")
    .addField('!bt leave', 'Quitte un blindtest en cours')
    .addField('!bt stop', 'Arrête un blindtest en cours')
    .addField('!bt categories', 'Affiche la liste des catégories disponible')
