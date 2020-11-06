import { Locale } from '~/@types/i18n'

const messageIds = [
  'global.separator',
  'blindtest.stopping',
  'blindtest.user-left',
  'blindtest.cant-join-already-started',
  'blindtest.user-joined',
  'blindtest.commands.categories',
  'blindtest.commands.players',
  'blindtest.already-joined',
  'blindtest.no-pending-blindtests',
  'blindtest.already-started',
  'blindtest.deleted',
  'blindtest.only-owner-can-start',
  'blindtest.only-owner-can-stop',
  'blindtest.will-start',
  'blindtest.finished',
  'blindtest.max-duration-exceeded',
  'blindtest.max-duration-exceeded-artists',
  'blindtest.owner-left',
  'blindtest.on-artist-found',
  'blindtest.on-music-found',
  'blindtest.bonus.fast',
  'blindtest.bonus.sonic',
  'blindtest.next-song-within',
  'blindtest.needs-vocal-channel',
  'blindtest.already-created-by',
  'blindtest.create-success',
  'blindtest.create-limit',
  'blindtest.create-category',
  'blindtest.create-skip-artist',
  'listen-on-spotify',
  'blindtest.on-song-skipped',
  'blindtest.on-skip-vote',
] as const

export type MessageIds = typeof messageIds[number]

type MessageMap = Map<MessageIds, string>

const messages = new Map<Locale, MessageMap>()

const french: MessageMap = new Map()
french
  .set('global.separator', '===================================')
  .set(
    'blindtest.on-song-skipped',
    'La majorité a voté pour passer la musique, vous avez un peu de mal non ? {hap}'
  )
  .set(
    'blindtest.on-skip-vote',
    '📩 **{voter}** a voté pour passer la musique. (*{currentVotes}/{maxVotes} votes requis*)'
  )
  .set('listen-on-spotify', 'Écouter sur Spotify')
  .set(
    'blindtest.commands.players',
    '{typescript} Liste des joueurs {typescript}'
  )
  .set('blindtest.user-left', "Ce n'est qu'un aurevoir... 😥")
  .set(
    'blindtest.user-joined',
    "Bienvenue à toi jeune entrepreneur(e) ! {elizabeth} (me fait pas de remarque sur l'écriture inclusive {pole_emploi})"
  )
  .set(
    'blindtest.cant-join-already-started',
    '{oopsie} Je vois que tes AMIS ne sont pas réellement tes AMIS car ils jouent sans toi... Dommage car tu ne peux pas rejoindre un blindtest en cours, réessaie une prochaine fois {hap}'
  )
  .set('blindtest.stopping', '{rem} Fin du blindtest')
  .set(
    'blindtest.already-joined',
    "BAKA BAKA BAKAAAAA {sulk} ! T'es déjà dans le blindtest, tu mérites des gifles"
  )
  .set('blindtest.will-start', 'le blindtest va commencer')
  .set(
    'blindtest.no-pending-blindtests',
    "Aucun blindtest n'est en cours 😥. Tu peux en créér un avec !bt create."
  )
  .set('blindtest.deleted', 'Blindtest supprimé {rem}')
  .set(
    'blindtest.only-owner-can-start',
    'BAKA BAKA BAKAAAAA {sulk} ! Seul le créateur du blindtest (**{owner}**) peut démarrer le blindtest'
  )
  .set(
    'blindtest.only-owner-can-stop',
    'BAKA BAKA BAKAAAAA {sulk} ! Seul le créateur du blindtest (**{owner}**) peut arrêter le blindtest'
  )
  .set('blindtest.already-started', 'Un blindtest est déjà en cours {oopsie}')
  .set(
    'blindtest.commands.categories',
    'Voici la liste des catégories disponibles : {categories}'
  )
  .set(
    'blindtest.max-duration-exceeded',
    "Le délai maximum a été atteint et personne n'a trouvé {sulk}."
  )
  .set('blindtest.max-duration-exceeded-artists', ', par {artists}')
  .set(
    'blindtest.owner-left',
    "Étant donné que le créateur du blindtest est parti (sale lâche {hap}), @{user} va reprendre la relève. C'est à toi désormais que relève la dure responsabilité de démarrer le blindtest"
  )
  .set(
    'blindtest.on-artist-found',
    "↗ **+{pts}pts** pour **{user}** pour avoir trouvé le nom de l'artiste."
  )
  .set(
    'blindtest.on-music-found',
    '↗ **+{pts}pts** pour **{user}** pour avoir trouvé le nom de la musique.'
  )
  .set('blindtest.bonus.fast', 'En moins de 6s en plus, pas mal')
  .set(
    'blindtest.bonus.sonic',
    'GOTTA GO FAST {sanic}, tu as trouvé en moins de 3s ça devrait être toi le bot'
  )
  .set(
    'blindtest.finished',
    "Hélas... le blindtest est fini. J'espère qu'on se reverra 👉👈.. En attendant, voici les résultats"
  )
  .set(
    'blindtest.next-song-within',
    "⏳ La prochaine musique va démarrer d'ici {duration}s... ⏳"
  )
  .set(
    'blindtest.needs-vocal-channel',
    'BAKA BAKA BAKAAAAA {sulk} ! Tu dois être dans un channel vocal pour faire un blindtest {pole_emploi}'
  )
  .set('blindtest.create-success', 'Le blindtest a bien été créé.')
  .set(
    'blindtest.create-limit',
    'Une limite de {limit} musiques a été définie.'
  )
  .set(
    'blindtest.create-category',
    'Seul les musiques appartenant aux catégories suivantes seront disponibles : {categories}.'
  )
  .set(
    'blindtest.create-skip-artist',
    'De plus, les artistes ne seront pas pris en compte.'
  )
  .set(
    'blindtest.already-created-by',
    'Un blindtest créé par {user} est déjà en cours.'
  )

messages.set('fr', french)

export default messages
