// @shared

// WORKSPACE_PATH определяется динамически на сервере через getWorkspacePath()
// На клиенте используется актуальный путь из window.location
function getWorkspacePath(): string {
  if (typeof window !== 'undefined') {
    // Клиентская сторона - берём из URL
    const path = window.location.pathname.split('/')[1]
    return path || 'webinar-room'
  }
  // На сервере эта функция не должна вызываться
  throw new Error('getWorkspacePath() can only be called on client side')
}

interface ClrtTrackData {
  url: string
  action: string
  action_param1?: string
  action_param2?: string
  action_param3?: string
  action_param1_int?: number
  action_param2_int?: number
  action_param3_int?: number
  action_param1_float?: number
  action_param2_float?: number
  action_param3_float?: number
  action_param1_mapstrstr?: Record<string, string>
}

declare global {
  interface Window {
    clrtTrack?: (data: ClrtTrackData) => void
  }
}

export function usePlayerAnalytics(episodeId: string) {
  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const device =
    typeof navigator !== 'undefined'
      ? /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
        ? 'mobile'
        : 'desktop'
      : 'unknown'
  let lastProgressTime = 0
  const PROGRESS_INTERVAL = 60
  let isDestroyed = false

  function trackEvent(
    eventType: string,
    data?: {
      currentTime?: number
      duration?: number
      extra?: Record<string, string>
    }
  ) {
    if (isDestroyed) return
    if (typeof window === 'undefined' || !window.clrtTrack) return

    window.clrtTrack({
      url: `event://custom/${getWorkspacePath()}/player_${eventType}`,
      action: `player_${eventType}`,
      action_param1: episodeId,
      action_param2: sessionId,
      action_param3: device,
      action_param1_float: data?.currentTime ?? 0,
      action_param2_float: data?.duration ?? 0,
      action_param1_mapstrstr: data?.extra ?? {}
    })
  }

  function setupPlayer(player: any) {
    player.on(player.Events.Play, () => {
      trackEvent('play')
    })

    player.on(player.Events.Pause, async () => {
      try {
        const currentTime = await player.getCurrentTime()
        const duration = await player.getDuration()
        trackEvent('pause', { currentTime, duration })
      } catch (e) {
        trackEvent('pause')
      }
    })

    player.on(player.Events.TimeUpdate, async (event: any) => {
      const currentTime = event?.data?.currentTime ?? 0

      if (currentTime < lastProgressTime) {
        lastProgressTime = currentTime
      }

      if (currentTime - lastProgressTime >= PROGRESS_INTERVAL) {
        lastProgressTime = currentTime
        try {
          const duration = await player.getDuration()
          const currentMinute = Math.floor(currentTime / 60)
          trackEvent('progress', {
            currentTime,
            duration,
            extra: { minute: String(currentMinute) }
          })
        } catch (e) {
          trackEvent('progress', {
            currentTime
          })
        }
      }
    })

    player.on(player.Events.Ended, async () => {
      try {
        const duration = await player.getDuration()
        trackEvent('ended', { duration })
      } catch (e) {
        trackEvent('ended')
      }
    })

    let lastSeekTime = 0
    player.on(player.Events.Seeked, async () => {
      try {
        const currentTime = await player.getCurrentTime()
        const duration = await player.getDuration()
        if (Math.abs(currentTime - lastSeekTime) > 5) {
          lastProgressTime = currentTime
          trackEvent('seek', {
            currentTime,
            duration,
            extra: {
              from: String(Math.round(lastSeekTime)),
              to: String(Math.round(currentTime)),
              direction: currentTime > lastSeekTime ? 'forward' : 'backward'
            }
          })
        }
        lastSeekTime = currentTime
      } catch (e) {
        trackEvent('seek')
      }
    })

    player.on(player.Events.QualityChanged, (event: any) => {
      trackEvent('quality_changed', {
        extra: { quality: String(event?.data?.quality || '') }
      })
    })

    player.on(player.Events.VolumeChange, (event: any) => {
      trackEvent('volume_change', {
        extra: {
          volume: String(event?.data?.volume ?? ''),
          muted: String(event?.data?.muted ?? '')
        }
      })
    })

    player.on(player.Events.FullscreenChange, (event: any) => {
      trackEvent('fullscreen_change', {
        extra: { fullscreen: String(event?.data?.fullscreen ?? '') }
      })
    })

    player.on(player.Events.Error, (event: any) => {
      trackEvent('error', {
        extra: { error: String(event?.data?.error || 'unknown') }
      })
    })

    if (player.Events.CallAction) {
      player.on(player.Events.CallAction, (event: any) => {
        trackEvent('cta_click')
      })
    }

    player.once(player.Events.Loaded, async (event: any) => {
      try {
        const duration = await player.getDuration()
        trackEvent('loaded', {
          duration,
          extra: { quality: String(event?.data?.quality || '') }
        })
      } catch (e) {
        trackEvent('loaded')
      }
    })
  }

  function destroy() {
    isDestroyed = true
  }

  return {
    trackEvent,
    setupPlayer,
    destroy,
    sessionId
  }
}
