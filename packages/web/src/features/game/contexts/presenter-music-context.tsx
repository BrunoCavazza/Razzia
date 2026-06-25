import { MEDIA_TYPES } from "@razzia/common/constants"
import type { Status } from "@razzia/common/types/game/status"
import { STATUS } from "@razzia/common/types/game/status"
import { useManagerStore } from "@razzia/web/features/game/stores/manager"
import {
  DEFAULT_PRESENTER_TRACK,
  FADE_MS,
  MUSIC_MANIFEST_URL,
  PRESENTER_MUSIC_ACTIVE_STATUSES,
  PRESENTER_MUSIC_PAUSE_STATUSES,
  PRESENTER_MUSIC_STOP_STATUSES,
  PRESENTER_MUSIC_VOLUME_KEY,
  fadeAudioVolume,
  shuffle,
} from "@razzia/web/features/game/utils/presenter-music"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

interface PresenterMusicContextValue {
  volume: number
  setVolume: (volume: number) => void
}

const PresenterMusicContext = createContext<PresenterMusicContextValue | null>(
  null,
)

export const usePresenterMusic = () => useContext(PresenterMusicContext)

const shouldPauseForMedia = (statusName: Status | undefined) => {
  if (
    statusName !== STATUS.SHOW_QUESTION &&
    statusName !== STATUS.SELECT_ANSWER
  ) {
    return false
  }

  const { status } = useManagerStore.getState()
  const media = status?.data?.media

  return media?.type === MEDIA_TYPES.AUDIO || media?.type === MEDIA_TYPES.VIDEO
}

const shouldPlayForStatus = (statusName: Status | undefined) => {
  if (!statusName) {
    return false
  }

  if (
    !PRESENTER_MUSIC_ACTIVE_STATUSES.includes(
      statusName as (typeof PRESENTER_MUSIC_ACTIVE_STATUSES)[number],
    )
  ) {
    return false
  }

  return !shouldPauseForMedia(statusName)
}

const shouldPauseForStatus = (statusName: Status | undefined) => {
  if (!statusName) {
    return true
  }

  if (
    PRESENTER_MUSIC_PAUSE_STATUSES.includes(
      statusName as (typeof PRESENTER_MUSIC_PAUSE_STATUSES)[number],
    )
  ) {
    return true
  }

  return shouldPauseForMedia(statusName)
}

const shouldStopForStatus = (statusName: Status | undefined) => {
  if (!statusName) {
    return true
  }

  return PRESENTER_MUSIC_STOP_STATUSES.includes(
    statusName as (typeof PRESENTER_MUSIC_STOP_STATUSES)[number],
  )
}

const PresenterMusicEngine = () => {
  const statusName = useManagerStore((state) => state.status?.name)
  const music = usePresenterMusic()
  const volume = music?.volume ?? 0.45

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playlistRef = useRef<string[]>([])
  const trackIndexRef = useRef(0)
  const fadeTokenRef = useRef(0)
  const playingRef = useRef(false)

  const playNextTrack = useCallback(async () => {
    const audio = audioRef.current
    const playlist = playlistRef.current

    if (!audio || playlist.length === 0) {
      return
    }

    const src = playlist[trackIndexRef.current % playlist.length]
    trackIndexRef.current += 1

    audio.src = src
    audio.volume = 0
    audio.loop = playlist.length === 1

    try {
      await audio.play()
      playingRef.current = true
      await fadeAudioVolume(audio, 0, volume, FADE_MS)
    } catch {
      playingRef.current = false
    }
  }, [volume])

  const fadeOutAndPause = useCallback(async () => {
    const audio = audioRef.current

    if (!audio || !playingRef.current) {
      return
    }

    const token = ++fadeTokenRef.current
    const startVolume = audio.volume
    await fadeAudioVolume(audio, startVolume, 0, FADE_MS)

    if (token !== fadeTokenRef.current) {
      return
    }

    audio.pause()
    playingRef.current = false
  }, [])

  const fadeInAndResume = useCallback(async () => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    const token = ++fadeTokenRef.current

    if (!audio.src) {
      await playNextTrack()
      return
    }

    try {
      if (audio.paused) {
        await audio.play()
      }

      playingRef.current = true
      await fadeAudioVolume(audio, audio.volume, volume, FADE_MS)

      if (token !== fadeTokenRef.current) {
        return
      }
    } catch {
      await playNextTrack()
    }
  }, [playNextTrack, volume])

  useEffect(() => {
    const loadPlaylist = async () => {
      try {
        const response = await fetch(MUSIC_MANIFEST_URL)
        const data = (await response.json()) as { tracks?: string[] }
        playlistRef.current =
          data.tracks && data.tracks.length > 0
            ? shuffle(data.tracks)
            : [DEFAULT_PRESENTER_TRACK]
        trackIndexRef.current = 0
      } catch {
        playlistRef.current = [DEFAULT_PRESENTER_TRACK]
        trackIndexRef.current = 0
      }
    }

    void loadPlaylist()
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const onEnded = () => {
      if (playlistRef.current.length <= 1) {
        return
      }

      void playNextTrack()
    }

    audio.addEventListener("ended", onEnded)

    return () => {
      audio.pause()
      audio.removeEventListener("ended", onEnded)
      audioRef.current = null
    }
  }, [playNextTrack])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio || !playingRef.current) {
      return
    }

    void fadeAudioVolume(audio, audio.volume, volume, FADE_MS)
  }, [volume])

  useEffect(() => {
    const sync = async () => {
      if (shouldStopForStatus(statusName)) {
        fadeTokenRef.current += 1
        audioRef.current?.pause()
        playingRef.current = false
        return
      }

      if (shouldPauseForStatus(statusName) || !shouldPlayForStatus(statusName)) {
        await fadeOutAndPause()
        return
      }

      if (!playingRef.current) {
        await fadeInAndResume()
      }
    }

    void sync()
  }, [statusName, fadeInAndResume, fadeOutAndPause])

  return null
}

export const PresenterMusicProvider = ({ children }: { children: ReactNode }) => {
  const [volume, setVolumeState] = useState(() => {
    const stored = localStorage.getItem(PRESENTER_MUSIC_VOLUME_KEY)
    const parsed = stored ? Number.parseFloat(stored) : 0.45

    return Number.isFinite(parsed) ? parsed : 0.45
  })

  const setVolume = useCallback((next: number) => {
    const clamped = Math.min(1, Math.max(0, next))
    setVolumeState(clamped)
    localStorage.setItem(PRESENTER_MUSIC_VOLUME_KEY, String(clamped))
  }, [])

  return (
    <PresenterMusicContext.Provider value={{ volume, setVolume }}>
      <PresenterMusicEngine />
      {children}
    </PresenterMusicContext.Provider>
  )
}
