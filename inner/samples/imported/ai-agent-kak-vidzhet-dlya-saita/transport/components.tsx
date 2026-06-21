// @shared

import { Accessor, createSolidComponent, jsx } from '@app/solid-js'
import { ChannelDto } from '@sender/sdk'

type CreateFormProps = {
  onBotSaved: (id: string) => Promise<void>
}

// Это компонент, который будет отображен сендером при создании нового транспорта данного типа
export const CreateTransportForm = createSolidComponent((props: CreateFormProps) => {
  return <div></div>
})

type TransportSettingsFormProps = {
  transport: Accessor<ChannelDto>
  onSave: (data: ChannelDto) => Promise<void>
}

// Это компонент, который будет отображен сендером при редактировании настроек транспорта данного типа
export const TransportSettingsForm = createSolidComponent((props: TransportSettingsFormProps) => {
  return <div></div>
})
