import messages, { MessageIds } from '~/translations/messages'
import { Logger } from '~/services/logger'
import { currentLocale, defaultLocale } from '~/translations/config'

const t = (key: MessageIds, values?: Record<string, any>) => {
  if (!messages.has(currentLocale) || !messages.get(currentLocale)!.get(key)) {
    Logger.warn(`Translation '${key}' for locale '${currentLocale}' not found.`)
  }
  let message =
    messages.get(currentLocale)!.get(key) ??
    messages.get(defaultLocale)!.get(key) ??
    key
  if (values) {
    Object.entries(values).map(([key, value]) => {
      message = message.replace(`{${key}}`, value)
    })
  }
  return message
}

export { t }
