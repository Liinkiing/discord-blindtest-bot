import { MessageEmbed } from 'discord.js'
import { Song } from '~/entities/song'
import { t } from '~/translations'

const color = '#1DB954'

export const SONG_INFO_EMBED = (song: Song): MessageEmbed =>
  new MessageEmbed()
    .setColor(color)
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

export const INFO_EMBED = (): MessageEmbed =>
  new MessageEmbed()
    .setColor('#ff0000')
    .setTitle('**MINA, GAMBATENE**')
    .addField('!bt help', 'Affiche cette aide')
    .addField(
      '!bt create `--category | -c <CATEGORY>` `--limit | -l <LIMIT>` `--boardSong | -b <TRUE|FALSE>` `--skipArtists | -s <TRUE|FALSE>`',
      'Créér un blindtest'
    )
    .addFields(
      { name: '--category', value: 'Filtrer par catégories', inline: true },
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
    .addField('!bt players', 'Affiche la liste des joueurs')
    .addField('!bt join', 'Rejoint un blindtest en cours')
    .addField('!bt skip', 'Lancer un vote pour passer à la prochaine musique')
    .addField('!bt delete', "Supprime un blindtest qui vient d'être créé")
    .addField('!bt leave', 'Quitte un blindtest en cours')
    .addField('!bt stop', 'Arrête un blindtest en cours')
    .addField('!bt categories', 'Affiche la liste des catégories disponible')
