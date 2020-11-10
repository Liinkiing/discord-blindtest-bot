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
  let titles = (await AirtableApiClient.songs().select().all()).map(
    record => record.get('Title') as string
  )
  let i = 0
  for (const track of tracks) {
    // const artistId = track.artistLink!.split('/').pop()!
    // const artist = await client.getArtist(artistId)
    let title = track.title
    if (removeAfterDash) {
      title = title.split('-')[0]
      titles = titles.map(t => t.split('-')[0])
    }
    if (removeParens) {
      title = title.replace(/\([^()]*\)/g, '')
      titles = titles.map(t => t.replace(/\([^()]*\)/g, ''))
    }
    if (removeThemeWord) {
      title = title.replace(/(theme|main title)/gi, '')
      titles = titles.map(t => t.replace(/(theme|main title)/gi, ''))
    }
    title = title.trim()
    titles = titles.map(t => t.trim())
    if (titles.includes(title)) {
      console.log(`Skipping ${title} because it already exists...`)
      i = i + 1
    } else {
      console.log('Adding ' + title + '\n')
      await AirtableApiClient.songs()
        .create(
          {
            'Preview URL': track.preview,
            Title: title,
            Artists: track.artist.split(',').map(s => s.trim()),
            Genres: ['music'],
            Album: track.album,
            Picture: track.picture,
            Link: track.trackLink,
          },
          { typecast: true }
        )
        .catch(er => {
          console.log(er)
        })
      i = i + 1
    }
  }
  console.log(`Successfully handled ${i} songs`)
})()
