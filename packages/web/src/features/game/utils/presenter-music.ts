import { STATUS } from "@razzia/common/types/game/status"
import { SFX } from "@razzia/web/features/game/utils/constants"

export const DEFAULT_PRESENTER_TRACK = SFX.ANSWERS.MUSIC
export const MUSIC_MANIFEST_URL = "/music/custom/manifest.json"
export const PRESENTER_MUSIC_VOLUME_KEY = "razzia-presenter-music-volume"
export const FADE_MS = 1200

export const PRESENTER_MUSIC_PAUSE_STATUSES = [
  STATUS.SHOW_RESPONSES,
  STATUS.SHOW_LEADERBOARD,
] as const

export const PRESENTER_MUSIC_ACTIVE_STATUSES = [
  STATUS.SHOW_QUESTION,
  STATUS.SELECT_ANSWER,
] as const

export const PRESENTER_MUSIC_STOP_STATUSES = [
  STATUS.FINISHED,
  STATUS.WAIT,
] as const

export const shuffle = <T,>(items: T[]): T[] => {
  const list = [...items]

  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }

  return list
}

export const fadeAudioVolume = (
  audio: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
) =>
  new Promise<void>((resolve) => {
    const start = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      audio.volume = from + (to - from) * progress

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(step)
  })
