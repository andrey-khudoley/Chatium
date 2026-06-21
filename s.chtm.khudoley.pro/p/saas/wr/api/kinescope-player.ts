import { createPlayer, listPlayers } from '@kinescope/sdk'
import GlobalConfig from '../tables/global-config'

const PLAYER_NAME = 'Chatium Autowebinar'

const PLAYER_SETTINGS = {
  audio_tracks_button: false,
  autopause: false,
  autoplay: true,
  autoswitch_button: false,
  brand_color: '#F8005B',
  chat_button: false,
  context_menu_about: false,
  control_bar_visible_on_load: false,
  enable_default_subtitle: false,
  endscreen: 'reset',
  hotkeys_control: false,
  live_viewers_counter: true,
  mouse_click_control: false,
  next_button: false,
  pip_button: false,
  play_button: false,
  playback_speed_button: false,
  playback_speed_menu: false,
  playlist_button: false,
  prev_button: false,
  seo_metadata: false,
  show_time: false,
  subtitles_button: false,
  subtitles_search: false,
  timeline: false,
  title_subtitle: false,
  title_subtitle_visible_on_load: false,
  video_preload: true
}

async function playerExists(ctx: app.Ctx, playerId: string): Promise<boolean> {
  try {
    const result = await listPlayers(ctx)
    return result.data.some((p: any) => p.id === playerId)
  } catch {
    return false
  }
}

export async function getOrCreateKinescopeWebinarPlayer(ctx: app.Ctx): Promise<string> {
  const config = await GlobalConfig.getSingleton(ctx)

  // First, try to find player by name (most reliable)
  try {
    const result = await listPlayers(ctx)
    const existingPlayer = result.data.find((p: any) => p.name === PLAYER_NAME)
    if (existingPlayer) {
      const playerId = existingPlayer.id
      // Update config if it's different
      if (config.kinescopeAutowebinarPlayerId !== playerId) {
        config.kinescopeAutowebinarPlayerId = playerId

        await GlobalConfig.updateSingleton(ctx, config)

        ctx.account.log('@webinar-room Found existing Kinescope player by name', {
          level: 'info',
          json: { playerId, name: PLAYER_NAME }
        })
      }
      return playerId
    }
  } catch (e: any) {
    ctx.account.log('@webinar-room Failed to list players', {
      level: 'warn',
      json: { error: e.message }
    })
  }

  // If not found by name, check config
  if (config.kinescopeAutowebinarPlayerId) {
    const exists = await playerExists(ctx, config.kinescopeAutowebinarPlayerId)
    if (exists) {
      return config.kinescopeAutowebinarPlayerId
    } else {
      // Плеер был удалён, очищаем невалидный ID
      ctx.account.log('@webinar-room Clearing invalid Kinescope player ID', {
        level: 'warn',
        json: { oldPlayerId: config.kinescopeAutowebinarPlayerId }
      })
      delete config.kinescopeAutowebinarPlayerId
    }
  }

  // Create new player
  const player = await createPlayer(ctx, {
    name: PLAYER_NAME,
    settings: PLAYER_SETTINGS
  })

  const playerId = player.data.id

  config.kinescopeAutowebinarPlayerId = playerId

  await GlobalConfig.updateSingleton(ctx, config)

  ctx.account.log('@webinar-room Created shared Kinescope player "Chatium Autowebinar"', {
    level: 'info',
    json: { playerId }
  })

  return playerId
}

// Проверяет и исправляет playerId у автовебинара
export async function validateAndFixAutowebinarPlayer(ctx: app.Ctx, autowebinar: any) {
  if (!autowebinar.kinescopePlayerId) {
    return autowebinar.kinescopePlayerId
  }

  const exists = await playerExists(ctx, autowebinar.kinescopePlayerId)
  if (!exists) {
    // Плеер не найден, получаем/создаём правильный
    const validPlayerId = await getOrCreateKinescopeWebinarPlayer(ctx)
    return validPlayerId
  }

  return autowebinar.kinescopePlayerId
}
