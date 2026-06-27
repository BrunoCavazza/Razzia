import { EVENTS } from "@razzia/common/constants"
import type { Status } from "@razzia/common/types/game/status"
import { STATUS } from "@razzia/common/types/game/status"
import Button from "@razzia/web/components/Button"
import Loader from "@razzia/web/components/Loader"
import {
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import {
  MANAGER_SKIP_BTN,
  MANAGER_SKIP_EVENTS,
  isKeyOf,
} from "@razzia/web/features/game/utils/constants"
import type { Status as GameStatus } from "@razzia/web/features/game/utils/createStatus"
import type { StatusDataMap } from "@razzia/common/types/game/status"
import clsx from "clsx"
import { useCallback, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

const CONTROL_STATUS_LABELS: Partial<Record<Status, string>> = {
  [STATUS.SHOW_ROOM]: "game:control.status.lobby",
  [STATUS.SHOW_START]: "game:control.status.starting",
  [STATUS.SHOW_PREPARED]: "game:control.status.prepared",
  [STATUS.SHOW_QUESTION]: "game:control.status.question",
  [STATUS.SELECT_ANSWER]: "game:control.status.answers",
  [STATUS.SHOW_RESPONSES]: "game:control.status.responses",
  [STATUS.SHOW_LEADERBOARD]: "game:control.status.leaderboard",
  [STATUS.FINISHED]: "game:control.status.finished",
  [STATUS.WAIT]: "game:control.status.wait",
}

interface Props {
  controlToken: string
}

const ControlPanel = ({ controlToken }: Props) => {
  const { socket, isConnected } = useSocket()
  const { t } = useTranslation()
  const [authState, setAuthState] = useState<"pending" | "ready" | "error">(
    "pending",
  )
  const [gameId, setGameId] = useState<string | null>(null)
  const [status, setStatus] = useState<GameStatus<StatusDataMap> | null>(null)
  const [questionLabel, setQuestionLabel] = useState<string | null>(null)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [isDisabled, setIsDisabled] = useState(false)

  const authenticate = useCallback(() => {
    socket.emit(EVENTS.CONTROL.AUTH, { controlToken })
  }, [controlToken, socket])

  useEvent("connect", authenticate)

  useEffect(() => {
    if (isConnected && authState === "pending") {
      authenticate()
    }
  }, [authenticate, authState, isConnected])

  useEvent(EVENTS.CONTROL.SUCCESS, (data) => {
    setAuthState("ready")
    setGameId(data.gameId)
    setStatus({ name: data.status.name, data: data.status.data })
    setTotalPlayers(data.totalPlayers)

    if (data.currentQuestion.total) {
      setQuestionLabel(
        `${data.currentQuestion.current} / ${data.currentQuestion.total}`,
      )
    }
  })

  useEvent(EVENTS.CONTROL.ERROR, (message) => {
    setAuthState("error")
    toast.error(t(message))
  })

  useEvent(EVENTS.GAME.STATUS, ({ name, data }) => {
    setStatus({ name, data })
  })

  useEvent(EVENTS.GAME.UPDATE_QUESTION, ({ current, total }) => {
    setQuestionLabel(`${current} / ${total}`)
  })

  useEvent(EVENTS.GAME.TOTAL_PLAYERS, (total) => {
    setTotalPlayers(total)
  })

  useEvent(EVENTS.GAME.ERROR_MESSAGE, (message) => {
    toast.error(t(message))
    setIsDisabled(false)
  })

  useEvent(EVENTS.GAME.RESET, (message) => {
    setAuthState("error")
    toast.error(t(message))
  })

  const handleAction = () => {
    if (!status || !gameId) {
      return
    }

    if (!isKeyOf(MANAGER_SKIP_EVENTS, status.name)) {
      return
    }

    setIsDisabled(true)
    socket.emit(MANAGER_SKIP_EVENTS[status.name], { gameId })
  }

  useEffect(() => {
    setIsDisabled(false)
  }, [status?.name])

  const actionLabel =
    status && isKeyOf(MANAGER_SKIP_BTN, status.name)
      ? MANAGER_SKIP_BTN[status.name]
      : null

  const canAct =
    status &&
    isKeyOf(MANAGER_SKIP_EVENTS, status.name) &&
    status.name !== STATUS.FINISHED

  const statusLabel = status
    ? t(CONTROL_STATUS_LABELS[status.name] ?? "game:control.status.wait")
    : t("game:control.connecting")

  if (!isConnected || authState === "pending") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-white">
        <Loader className="h-16" />
        <p className="text-xl font-semibold">{t("game:control.connecting")}</p>
      </div>
    )
  }

  if (authState === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center text-white">
        <h1 className="text-2xl font-bold">{t("game:control.title")}</h1>
        <p className="text-white/70">{t("game:control.invalidLink")}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col p-6 text-white">
      <header className="mb-8 text-center">
        <p className="text-sm font-semibold tracking-wide text-violet-300 uppercase">
          {t("game:control.title")}
        </p>
        <h1 className="mt-2 text-3xl font-bold">{statusLabel}</h1>
        {questionLabel && (
          <p className="mt-2 text-lg text-white/70">
            {t("game:questionPrefix")}
            {questionLabel}
          </p>
        )}
        <p className="mt-4 text-base text-white/80">
          {t("game:control.players")}: {totalPlayers}
        </p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center">
        {canAct && actionLabel ? (
          <Button
            className={clsx(
              "w-full max-w-sm py-6 text-xl font-bold",
              {
                "pointer-events-none opacity-60": isDisabled,
              },
            )}
            onClick={handleAction}
          >
            {t(actionLabel)}
          </Button>
        ) : (
          <p className="text-center text-lg text-white/60">
            {status?.name === STATUS.FINISHED
              ? t("game:control.status.finished")
              : t("game:control.waitingAction")}
          </p>
        )}
      </div>
    </div>
  )
}

export default ControlPanel
