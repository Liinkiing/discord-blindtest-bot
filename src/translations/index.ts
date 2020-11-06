import messages, { MessageIds } from '~/translations/messages'
import { Logger } from '~/services/logger'
import { currentLocale, defaultLocale } from '~/translations/config'

const t = (key: MessageIds, values?: Record<string, any>): string => {
  if (!messages.has(currentLocale) || !messages.get(currentLocale)!.get(key)) {
    Logger.warn(`Translation '${key}' for locale '${currentLocale}' not found.`)
  }
  let message =
    messages.get(currentLocale)!.get(key) ??
    messages.get(defaultLocale)!.get(key) ??
    key
  if (values) {
    Object.entries(values).map(([k, v]) => {
      message = message.replace(new RegExp(`{${k}}`, 'g'), v)
    })
  }
  return message
}

export { t }
