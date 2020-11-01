import chlk from 'chalk'

const getTime = () => new Date().toISOString()

export class Logger {
  public static info = (...messages: string[]): void => {
    console.log.call(
      console,
      chlk.blue('[INFO]:'),
      chlk.gray(getTime()),
      ...messages
    )
  }

  public static success = (...messages: string[]): void => {
    console.log.call(
      console,
      chlk.green('[SUCCESS]:'),
      chlk.gray(getTime()),
      ...messages
    )
  }

  public static error = (...messages: string[]): void => {
    console.log.call(
      console,
      chlk.red('[ERROR]:'),
      chlk.gray(getTime()),
      ...messages
    )
  }

  public static warn = (...messages: string[]): void => {
    console.log.call(
      console,
      chlk.yellow('[WARN]:'),
      chlk.gray(getTime()),
      ...messages
    )
  }
}
