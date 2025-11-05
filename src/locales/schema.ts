import enUS from './en-US.json' with { type: 'json' }

export type MessageSchema = typeof enUS

export type NumberSchema = {
  currency: {
    style: 'currency'
    currencyDisplay: 'symbol'
    currency: string
  }
}