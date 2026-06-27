import { usePresenterMusic } from "@razzia/web/features/game/contexts/presenter-music-context"
import { Pause, Play, SkipForward, Volume2 } from "lucide-react"
import { useTranslation } from "react-i18next"

const PresenterMusicControls = () => {
  const music = usePresenterMusic()
  const { t } = useTranslation()

  if (!music) {
    return null
  }

  const { volume, setVolume, isPaused, togglePause, skipTrack } = music

  return (
    <div className="flex items-center gap-1 rounded-md bg-black/40 px-2 py-2 text-white">
      <button
        type="button"
        onClick={togglePause}
        className="rounded p-1 hover:bg-white/15"
        aria-label={isPaused ? t("game:music.play") : t("game:music.pause")}
      >
        {isPaused ? (
          <Play className="size-4 shrink-0" aria-hidden />
        ) : (
          <Pause className="size-4 shrink-0" aria-hidden />
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          music.primeAudioPlayback()
          skipTrack()
        }}
        className="rounded p-1 hover:bg-white/15"
        aria-label={t("game:music.skip")}
      >
        <SkipForward className="size-4 shrink-0" aria-hidden />
      </button>

      <label className="flex items-center gap-2 pl-1">
        <Volume2 className="size-4 shrink-0" aria-hidden />
        <span className="sr-only">{t("game:music.volume")}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(event) => setVolume(Number.parseFloat(event.target.value))}
          className="w-24 accent-white"
          aria-label={t("game:music.volume")}
        />
      </label>
    </div>
  )
}

export default PresenterMusicControls
