import { EVENTS } from "@razzia/common/constants"
import { useSocket } from "@razzia/web/features/game/contexts/socket-context"
import { useManagerStore } from "@razzia/web/features/game/stores/manager"
import {
  MUSIC_MANIFEST_URL,
  type MusicManifest,
} from "@razzia/web/features/game/utils/presenter-music"
import { Music2 } from "lucide-react"
import { useEffect, useState, type ChangeEvent } from "react"
import { useTranslation } from "react-i18next"

const PresenterMusicPlaylistSelect = () => {
  const { socket } = useSocket()
  const { gameId, musicPlaylist, setMusicPlaylist } = useManagerStore()
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
    const value = event.target.value
    const nextPlaylist = value === "" ? null : value

    setMusicPlaylist(nextPlaylist)

    if (gameId) {
      socket.emit(EVENTS.MANAGER.SET_MUSIC_PLAYLIST, {
        gameId,
        musicPlaylist: nextPlaylist,
      })
    }
  }

  return (
    <label className="flex items-center gap-2 rounded-md bg-black/40 px-3 py-2 text-white">
      <Music2 className="size-4 shrink-0" aria-hidden />
      <span className="sr-only">{t("game:music.playlist.title")}</span>
      <select
        value={musicPlaylist ?? ""}
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

export default PresenterMusicPlaylistSelect
