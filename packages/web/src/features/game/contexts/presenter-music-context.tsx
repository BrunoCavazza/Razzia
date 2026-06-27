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
  VOLUME_FADE_MS,
  fadeAudioVolume,
  resolvePresenterTracks,
  shuffle,
  type MusicManifest,
} from "@razzia/web/features/game/utils/presenter-music"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react"
import { EVENTS } from "@razzia/common/constants"
import { useEvent } from "@razzia/web/features/game/contexts/socket-context"

interface PresenterMusicControls {
  skipTrack: () => void
  togglePause: () => void
}

interface PresenterMusicContextValue {
  volume: number
  setVolume: (volume: number) => void
  isPaused: boolean
  togglePause: () => void
  skipTrack: () => void
  primeAudioPlayback: () => void
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

const PresenterMusicEngine = ({
  volume,
  userPaused,
  setUserPaused,
  controlsRef,
  primeAudioRef,
}: {
  volume: number
  userPaused: boolean
  setUserPaused: (paused: boolean) => void
  controlsRef: MutableRefObject<PresenterMusicControls>
  primeAudioRef: MutableRefObject<() => void>
}) => {
  const statusName = useManagerStore((state) => state.status?.name)
  const musicPlaylist = useManagerStore((state) => state.musicPlaylist)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playlistRef = useRef<string[]>([])
  const trackIndexRef = useRef(0)
  const fadeTokenRef = useRef(0)
  const playingRef = useRef(false)
  const volumeRef = useRef(volume)
  const userPausedRef = useRef(userPaused)
  const statusNameRef = useRef(statusName)

  volumeRef.current = volume
  userPausedRef.current = userPaused
  statusNameRef.current = statusName

  const isCancelled = (token: number) => token !== fadeTokenRef.current

  const shouldBeAudible = () =>
    shouldPlayForStatus(statusNameRef.current) && !userPausedRef.current

  const playNextTrack = useCallback(async () => {
    const audio = audioRef.current
    const playlist = playlistRef.current

    if (
      !audio ||
      playlist.length === 0 ||
      shouldStopForStatus(statusNameRef.current)
    ) {
      return
    }

    const token = ++fadeTokenRef.current
    const src = playlist[trackIndexRef.current % playlist.length]
    trackIndexRef.current += 1

    audio.src = src
    audio.loop = playlist.length === 1
    audio.volume = 0

    const targetVolume = shouldBeAudible() ? volumeRef.current : 0

    try {
      await audio.play()
      playingRef.current = true

      if (targetVolume > 0) {
        await fadeAudioVolume(
          audio,
          0,
          targetVolume,
          FADE_MS,
          () => isCancelled(token),
        )
      }
    } catch {
      playingRef.current = false
    }
  }, [])

  const fadeOutAndPause = useCallback(async () => {
    const audio = audioRef.current

    if (!audio || !playingRef.current) {
      return
    }

    const token = ++fadeTokenRef.current
    const startVolume = audio.volume

    await fadeAudioVolume(
      audio,
      startVolume,
      0,
      FADE_MS,
      () => isCancelled(token),
    )

    if (isCancelled(token)) {
      return
    }

    audio.pause()
    playingRef.current = false
  }, [])

  const fadeInAndResume = useCallback(async () => {
    const audio = audioRef.current

    if (!audio || userPausedRef.current) {
      return
    }

    const token = ++fadeTokenRef.current

    if (!audio.src) {
      await playNextTrack()
      return
    }

    const targetVolume = volumeRef.current

    try {
      if (audio.paused) {
        await audio.play()
      }

      playingRef.current = true

      if (targetVolume <= 0) {
        audio.volume = 0
        return
      }

      await fadeAudioVolume(
        audio,
        audio.volume,
        targetVolume,
        FADE_MS,
        () => isCancelled(token),
      )
    } catch {
      await playNextTrack()
    }
  }, [playNextTrack])

  const skipTrack = useCallback(async () => {
    if (shouldStopForStatus(statusNameRef.current)) {
      return
    }

    const audio = audioRef.current
    const playlist = playlistRef.current

    if (!audio || playlist.length === 0) {
      return
    }

    fadeTokenRef.current += 1
    audio.pause()
    playingRef.current = false

    const canPlayNow = shouldBeAudible() && !userPausedRef.current

    if (playlist.length === 1) {
      audio.currentTime = 0

      if (!canPlayNow) {
        return
      }

      const token = ++fadeTokenRef.current
      audio.volume = 0

      try {
        await audio.play()
        playingRef.current = true
        await fadeAudioVolume(
          audio,
          0,
          volumeRef.current,
          FADE_MS,
          () => isCancelled(token),
        )
      } catch {
        playingRef.current = false
      }

      return
    }

    const src = playlist[trackIndexRef.current % playlist.length]
    trackIndexRef.current += 1

    audio.src = src
    audio.loop = false
    audio.volume = 0

    if (!canPlayNow) {
      return
    }

    const token = ++fadeTokenRef.current

    try {
      await audio.play()
      playingRef.current = true
      await fadeAudioVolume(
        audio,
        0,
        volumeRef.current,
        FADE_MS,
        () => isCancelled(token),
      )
    } catch {
      playingRef.current = false
    }
  }, [])

  const togglePause = useCallback(async () => {
    if (userPausedRef.current) {
      setUserPaused(false)

      if (shouldPlayForStatus(statusNameRef.current)) {
        await fadeInAndResume()
      }

      return
    }

    setUserPaused(true)
    await fadeOutAndPause()
  }, [fadeInAndResume, fadeOutAndPause, setUserPaused])

  controlsRef.current = { skipTrack, togglePause }

  const playNextTrackRef = useRef(playNextTrack)
  playNextTrackRef.current = playNextTrack

  const resetAudioSource = useCallback(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    audio.pause()
    audio.removeAttribute("src")
    audio.load()
    playingRef.current = false
  }, [])

  const syncPlayback = useCallback(async () => {
    if (playlistRef.current.length === 0) {
      return
    }

    if (shouldStopForStatus(statusNameRef.current)) {
      fadeTokenRef.current += 1
      audioRef.current?.pause()
      playingRef.current = false
      return
    }

    if (userPausedRef.current) {
      return
    }

    if (
      shouldPauseForStatus(statusNameRef.current) ||
      !shouldPlayForStatus(statusNameRef.current)
    ) {
      await fadeOutAndPause()
      return
    }

    if (!playingRef.current) {
      await fadeInAndResume()
      return
    }

    const audio = audioRef.current

    if (audio?.paused) {
      await fadeInAndResume()
    }
  }, [fadeInAndResume, fadeOutAndPause])

  const syncPlaybackRef = useRef(syncPlayback)
  syncPlaybackRef.current = syncPlayback

  const primeAudioPlayback = useCallback(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    const playlist = playlistRef.current

    if (playlist.length === 0) {
      audio.src = DEFAULT_PRESENTER_TRACK
      audio.volume = 0
      audio.loop = true

      const unlock = audio.play()

      if (unlock) {
        unlock
          .then(() => {
            audio.pause()
            audio.removeAttribute("src")
            audio.load()
          })
          .catch(() => {})
      }

      return
    }

    if (!audio.src) {
      const src = playlist[trackIndexRef.current % playlist.length]
      audio.src = src
      audio.loop = playlist.length === 1
      audio.volume = 0
    }

    const playResult = audio.play()

    if (playResult) {
      playResult
        .then(() => {
          playingRef.current = true
          void syncPlaybackRef.current()
        })
        .catch(() => {
          playingRef.current = false
        })
    }
  }, [])

  const [audioReady, setAudioReady] = useState(false)
  const [playlistRevision, setPlaylistRevision] = useState(0)

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const onEnded = () => {
      if (playlistRef.current.length <= 1) {
        return
      }

      void playNextTrackRef.current()
    }

    audio.addEventListener("ended", onEnded)
    setAudioReady(true)

    return () => {
      audio.pause()
      audio.removeEventListener("ended", onEnded)
      audioRef.current = null
      setAudioReady(false)
    }
  }, [])

  useEffect(() => {
    if (!audioReady) {
      return
    }

    const loadPlaylist = async () => {
      fadeTokenRef.current += 1
      resetAudioSource()

      try {
        const response = await fetch(MUSIC_MANIFEST_URL)
        const data = (await response.json()) as MusicManifest
        const tracks = resolvePresenterTracks(data, musicPlaylist)
        playlistRef.current = shuffle(tracks)
        trackIndexRef.current = 0
      } catch {
        playlistRef.current = [DEFAULT_PRESENTER_TRACK]
        trackIndexRef.current = 0
      }

      setPlaylistRevision((revision) => revision + 1)
    }

    void loadPlaylist()
  }, [audioReady, musicPlaylist, resetAudioSource])

  useEffect(() => {
    void syncPlayback()
  }, [statusName, playlistRevision, userPaused, syncPlayback])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio || !playingRef.current) {
      return
    }

    const token = ++fadeTokenRef.current
    const target = volumeRef.current

    if (target <= 0) {
      audio.volume = 0
      return
    }

    if (!shouldBeAudible()) {
      return
    }

    void fadeAudioVolume(
      audio,
      audio.volume,
      target,
      VOLUME_FADE_MS,
      () => isCancelled(token),
    )
  }, [volume])

  useEffect(() => {
    primeAudioRef.current = primeAudioPlayback
  }, [primeAudioPlayback])

  return null
}

export const PresenterMusicProvider = ({ children }: { children: ReactNode }) => {
  const primeAudioRef = useRef<() => void>(() => {})
  const [volume, setVolumeState] = useState(() => {
    const stored = localStorage.getItem(PRESENTER_MUSIC_VOLUME_KEY)
    const parsed = stored ? Number.parseFloat(stored) : 0.45

    return Number.isFinite(parsed) ? parsed : 0.45
  })
  const [userPaused, setUserPaused] = useState(false)
  const controlsRef = useRef<PresenterMusicControls>({
    skipTrack: () => {},
    togglePause: () => {},
  })

  const setVolume = useCallback((next: number) => {
    const clamped = Math.min(1, Math.max(0, next))
    setVolumeState(clamped)
    localStorage.setItem(PRESENTER_MUSIC_VOLUME_KEY, String(clamped))
  }, [])

  const skipTrack = useCallback(() => {
    void controlsRef.current.skipTrack()
  }, [])

  useEvent(EVENTS.GAME.MUSIC_SKIP, () => {
    void controlsRef.current.skipTrack()
  })

  const togglePause = useCallback(() => {
    void controlsRef.current.togglePause()
  }, [])

  const primeAudioPlayback = useCallback(() => {
    primeAudioRef.current()
  }, [primeAudioRef])

  const primedRef = useRef(false)

  const handlePointerDown = useCallback(() => {
    if (primedRef.current) {
      return
    }

    primedRef.current = true
    primeAudioRef.current()
  }, [primeAudioRef])

  return (
    <PresenterMusicContext.Provider
      value={{
        volume,
        setVolume,
        isPaused: userPaused,
        togglePause,
        skipTrack,
        primeAudioPlayback,
      }}
    >
      <PresenterMusicEngine
        volume={volume}
        userPaused={userPaused}
        setUserPaused={setUserPaused}
        controlsRef={controlsRef}
        primeAudioRef={primeAudioRef}
      />
      <div onPointerDownCapture={handlePointerDown}>{children}</div>
    </PresenterMusicContext.Provider>
  )
}
