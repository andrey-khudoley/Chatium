// @shared

export type PaymentPluginId = 'lifepay' | 'lavatop' | 'getcourse'

export type PluginSettingInput = 'text' | 'password' | 'url' | 'boolean' | 'select'

export type PluginSettingOption = {
  label: string
  value: string
}

export type PluginSettingField = {
  key: string
  label: string
  input: PluginSettingInput
  required?: boolean
  secret?: boolean
  readonly?: boolean
  hidden?: boolean
  placeholder?: string
  hint?: string
  group?: string
  generator?: 'hex32' | 'hex64'
  options?: PluginSettingOption[]
}

export type PaymentPluginManifest = {
  id: PaymentPluginId
  title: string
  description?: string
  icon?: string
  fields: PluginSettingField[]
}

export type PluginPublicFieldValue = {
  key: string
  hasValue: boolean
  value?: string | boolean
  maskedValue?: string
}

export type PluginWebhookEndpoint = {
  key: string
  label: string
  url: string
  hint?: string
}

export type PluginRuntimeConfig = {
  manifest: PaymentPluginManifest
  values: Record<string, PluginPublicFieldValue>
  webhookEndpoints?: PluginWebhookEndpoint[]
  configured: boolean
  missingRequired: string[]
}

export type PluginSettingsGetResponse = {
  plugins: PluginRuntimeConfig[]
}

export type PluginSettingsSaveRequest = {
  pluginId?: unknown
  key?: unknown
  value?: unknown
}

export type PluginSettingsSaveResponse =
  | {
      success: true
      plugin: PluginRuntimeConfig
    }
  | {
      success: false
      error: string
    }

export type PluginSettingRevealRequest = {
  pluginId?: unknown
  key?: unknown
}

export type PluginSettingRevealResponse =
  | {
      success: true
      key: string
      value: string
    }
  | {
      success: false
      error: string
    }

export type LavatopCatalogOffer = {
  id: string
  title: string
}

export type LavatopCatalogProduct = {
  id: string
  title: string
  offers: LavatopCatalogOffer[]
}

export type LavatopCatalogResponse =
  | {
      success: true
      products: LavatopCatalogProduct[]
      requestId?: string
      pages: number
    }
  | {
      success: false
      error: string
      requestId?: string
    }
