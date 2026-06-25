import { usePresenterMusic } from "@razzia/web/features/game/contexts/presenter-music-context"
import { Volume2 } from "lucide-react"
import { useTranslation } from "react-i18next"

const PresenterMusicVolume = () => {
  const music = usePresenterMusic()
  const { t } = useTranslation()

  if (!music) {
    return null
  }

  const { volume, setVolume } = music

  return (
    <label className="flex items-center gap-2 rounded-md bg-black/40 px-3 py-2 text-white">
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
  )
}

export default PresenterMusicVolume
