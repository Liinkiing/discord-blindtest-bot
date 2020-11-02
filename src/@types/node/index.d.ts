declare namespace NodeJS {
  export interface ProcessEnv {
    readonly BOT_TOKEN: string
    readonly AIRTABLE_API_KEY: string
    readonly AIRTABLE_BASE_ID: string
    readonly AIRTABLE_TABLE_NAME: string
  }
}
