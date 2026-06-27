import { EVENTS } from "@razzia/common/constants"
import Button from "@razzia/web/components/Button"
import { useSocket } from "@razzia/web/features/game/contexts/socket-context"
import {
  MUSIC_MANIFEST_URL,
  type MusicManifest,
} from "@razzia/web/features/game/utils/presenter-music"
import { useConfig } from "@razzia/web/features/manager/contexts/config-context"
import clsx from "clsx"
import { Check } from "lucide-react"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

const ConfigSelectQuizz = () => {
  const { socket } = useSocket()
  const { quizz: quizzList } = useConfig()
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
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

  const handleSelect = (id: string) => () => {
    if (selected === id) {
      setSelected(null)
    } else {
      setSelected(id)
    }
  }

  const handleSelectPlaylist = (id: string | null) => () => {
    setSelectedPlaylist(id)
  }

  const handleSubmit = () => {
    if (!selected) {
      toast.error(t("manager:quizz.pleaseSelect"))

      return
    }

    socket.emit(EVENTS.GAME.CREATE, {
      quizzId: selected,
      musicPlaylist: selectedPlaylist,
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {quizzList.length > 0 && (
        <Button className="mb-4 shrink-0" onClick={handleSubmit}>
          {t("manager:quizz.startGame")}
        </Button>
      )}

      <div className="mb-4 shrink-0">
        <p className="mb-2 text-sm font-semibold text-gray-700">
          {t("game:music.playlist.title")}
        </p>
        <div className="space-y-2">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md p-3 outline outline-gray-300"
            onClick={handleSelectPlaylist(null)}
          >
            <span>{t("game:music.playlist.default")}</span>
            <div
              className={clsx(
                "size-5 rounded p-0.5 outline outline-offset-3 outline-gray-300",
                selectedPlaylist === null && "bg-primary border-primary/80",
              )}
            >
              {selectedPlaylist === null && (
                <Check className="size-full stroke-4 text-white" />
              )}
            </div>
          </button>

          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              className="flex w-full items-center justify-between rounded-md p-3 outline outline-gray-300"
              onClick={handleSelectPlaylist(playlist.id)}
            >
              <div className="text-left">
                <p>{playlist.name}</p>
                <p className="text-sm text-gray-500">
                  {t("game:music.playlist.trackCount", {
                    count: playlist.tracks.length,
                  })}
                </p>
              </div>
              <div
                className={clsx(
                  "size-5 rounded p-0.5 outline outline-offset-3 outline-gray-300",
                  selectedPlaylist === playlist.id &&
                    "bg-primary border-primary/80",
                )}
              >
                {selectedPlaylist === playlist.id && (
                  <Check className="size-full stroke-4 text-white" />
                )}
              </div>
            </button>
          ))}

          {playlists.length === 0 && (
            <p className="text-sm text-gray-500">
              {t("game:music.playlist.empty")}
            </p>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-0.5">
        {quizzList.map((quizz) => (
          <button
            key={quizz.id}
            className="flex w-full items-center justify-between rounded-md p-3 outline outline-gray-300"
            onClick={handleSelect(quizz.id)}
          >
            {quizz.subject}

            <div
              className={clsx(
                "size-5 rounded p-0.5 outline outline-offset-3 outline-gray-300",
                selected === quizz.id && "bg-primary border-primary/80",
              )}
            >
              {selected === quizz.id && (
                <Check className="size-full stroke-4 text-white" />
              )}
            </div>
          </button>
        ))}
        {!quizzList.length && (
          <div className="my-8 text-center text-gray-500">
            <p>{t("manager:quizz.notFound")}</p>
            <p className="text-sm">{t("manager:quizz.pleaseCreate")}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConfigSelectQuizz
