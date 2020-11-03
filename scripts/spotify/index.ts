// import Spotify from 'spotify-web-api-node'
import tracks from './tracks'
import AirtableApiClient from '../../src/services/airtable-api'

const removeAfterDash = true
const removeThemeWord = true
const removeParens = true

;(async () => {
  // const client = new Spotify({
  //   accessToken: process.env.SPOTIFY_ACCESS_TOKEN,
  // })
  for (const track of tracks) {
    // const artistId = track.artistLink!.split('/').pop()!
    // const artist = await client.getArtist(artistId)
    let title = track.title
    if (removeAfterDash) {
      title = title.split('-')[0]
    }
    if (removeParens) {
      title = title.replace(/\([^()]*\)/g, '')
    }
    if (removeThemeWord) {
      title = title.replace(/theme/gi, '')
      title = title.replace(/main title/gi, '')
    }
    console.log('Adding ' + title + '\n')
    await AirtableApiClient.songs()
      .create(
        {
          'Preview URL': track.preview,
          Title: title,
          Artists: track.artist.split(',').map(s => s.trim()),
          Genres: [],
          Album: track.album,
          Picture: track.picture,
          Link: track.trackLink,
        },
        { typecast: true }
      )
      .catch(er => {
        console.log(er)
      })
  }
})()
