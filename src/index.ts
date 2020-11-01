import { Bot } from '~/bot'
;(async () => {
  const bot = new Bot()
  await bot.login(process.env.BOT_TOKEN)
})()
