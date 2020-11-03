import Spotify from 'spotify-web-api-node'
import tracks from './tracks'
import AirtableApiClient from '../../src/services/airtable-api'
;(async () => {
  const client = new Spotify({
    accessToken: process.env.SPOTIFY_ACCESS_TOKEN,
  })
  for (const track of tracks) {
    const artistId = track.artistLink!.split('/').pop()!
    const artist = await client.getArtist(artistId)
    await AirtableApiClient.songs()
      .create(
        {
          'Preview URL': track.preview,
          Title: track.title,
          Artists: track.artist.split(',').map(s => s.trim()),
          Genres: artist.body.genres,
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
