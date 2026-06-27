import {
  MUSIC_MANIFEST_URL,
  type MusicManifest,
} from "@razzia/web/features/game/utils/presenter-music"
import { Music2 } from "lucide-react"
import { useEffect, useState, type ChangeEvent } from "react"
import { useTranslation } from "react-i18next"

export const MUSIC_PLAYLIST_STORAGE_KEY = "razzia-music-playlist"

interface Props {
  value: string | null
  onChange: (playlistId: string | null) => void
  variant?: "bar" | "form"
}

const MusicPlaylistSelect = ({
  value,
  onChange,
  variant = "form",
}: Props) => {
  const [playlists, setPlaylists] = useState<MusicManifest["playlists"]>([])
  const { t } = useTranslation()

  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const response = await fetch(MUSIC_MANIFEST_URL)
        const data = (await response.json()) as MusicManifest
        setPlaylists(data.playlists ?? [])
      } catch {
        setPlaylists([])
      }
    }

    void loadPlaylists()
  }, [])

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value
    onChange(nextValue === "" ? null : nextValue)
  }

  if (variant === "bar") {
    return (
      <label className="flex items-center gap-2 rounded-md bg-black/40 px-3 py-2 text-white">
        <Music2 className="size-4 shrink-0" aria-hidden />
        <span className="sr-only">{t("game:music.playlist.title")}</span>
        <select
          value={value ?? ""}
          onChange={handleChange}
          className="max-w-36 cursor-pointer bg-transparent text-sm font-semibold outline-none"
          aria-label={t("game:music.playlist.title")}
        >
          <option value="" className="text-black">
            {t("game:music.playlist.default")}
          </option>
          {playlists.map((playlist) => (
            <option key={playlist.id} value={playlist.id} className="text-black">
              {playlist.name} ({playlist.tracks.length})
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <label className="mb-4 block shrink-0">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Music2 className="size-4" aria-hidden />
        {t("game:music.playlist.title")}
      </span>
      <select
        value={value ?? ""}
        onChange={handleChange}
        className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary"
        aria-label={t("game:music.playlist.title")}
      >
        <option value="">{t("game:music.playlist.default")}</option>
        {playlists.map((playlist) => (
          <option key={playlist.id} value={playlist.id}>
            {playlist.name} ({playlist.tracks.length})
          </option>
        ))}
      </select>
      {playlists.length === 0 && (
        <p className="mt-1 text-xs text-gray-500">
          {t("game:music.playlist.empty")}
        </p>
      )}
    </label>
  )
}

export default MusicPlaylistSelect
