import { readWorkspaceFile, updateWorkspaceFile } from '@start/sdk'

interface ConnectedChannel {
  id: string
  title: string
  photo?: string | null
  username?: string
}

interface ConnectedAgent {
  id: string
  title: string
}

async function readConfig(ctx: app.Ctx) {
  const configData = await readWorkspaceFile(ctx, 'config/config.json')
  const config = safeJsonParse(configData?.source, {})

  return config
}

async function writeConfig(ctx: app.Ctx, config: any) {
  await updateWorkspaceFile(ctx, 'config/config.json', { source: JSON.stringify(config, null, 2) })
}

function safeJsonParse(json: any, defaultValue?: any) {
  try {
    return JSON.parse(json)
  } catch (error) {
    return defaultValue
  }
}

export async function getConnectedChannels(ctx: app.Ctx): Promise<ConnectedChannel[]> {
  const config = await readConfig(ctx)
  return config.channels ?? []
}

export async function setConnectedChannels(ctx: app.Ctx, channels: ConnectedChannel[]) {
  const config = await readConfig(ctx)
  await writeConfig(ctx, { ...config, channels })
}

export async function getConnectedAgent(ctx: app.Ctx): Promise<ConnectedAgent | null> {
  const config = await readConfig(ctx)
  return config.agent ?? null
}

export async function setConnectedAgent(ctx: app.Ctx, agent: ConnectedAgent | null) {
  const config = await readConfig(ctx)
  await writeConfig(ctx, { ...config, agent })
}
