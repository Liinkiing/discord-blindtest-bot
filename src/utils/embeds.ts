import { MessageEmbed } from 'discord.js'
import { Song } from '~/entities/song'
import { t } from '~/translations'

const color = '#1DB954'

export const SONG_INFO_EMBED = (song: Song) =>
  new MessageEmbed()
    .setColor(color)
    .setThumbnail('https://www.nautiljon.com/images/perso/00/82/rem_13328.jpg')
    .setImage(song.picture ?? '')
    .setTitle(song.title)
    .setURL(song.link)
    .setFooter(
      song.artists.join(', '),
      'https://e7.pngegg.com/pngimages/420/432/png-clipart-spotify-logo-spotify-computer-icons-podcast-music-apps-miscellaneous-angle-thumbnail.png'
    )
    .setDescription(t('listen-on-spotify'))
