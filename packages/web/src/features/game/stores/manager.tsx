import type { Player } from "@razzia/common/types/game"
import type { StatusDataMap } from "@razzia/common/types/game/status"
import type { ManagerConfig } from "@razzia/common/types/manager"
import {
  createStatus,
  type Status,
} from "@razzia/web/features/game/utils/createStatus"
import { create } from "zustand"

interface ManagerStore<T> {
  config: ManagerConfig | null

  gameId: string | null
  controlToken: string | null
  musicPlaylist: string | null
  status: Status<T> | null
  players: Player[]

  setConfig: (_config: ManagerConfig) => void
  setGameId: (_gameId: string | null) => void
  setControlToken: (_controlToken: string | null) => void
  setMusicPlaylist: (_musicPlaylist: string | null) => void
  setStatus: <K extends keyof T>(_name: K, _data: T[K]) => void
  resetStatus: () => void
  setPlayers: (_players: Player[]) => void

  reset: () => void
}

const initialState = {
  config: null,
  gameId: null,
  controlToken: null,
  musicPlaylist: null,
  status: null,
  players: [],
}

export const useManagerStore = create<ManagerStore<StatusDataMap>>((set) => ({
  ...initialState,

  setConfig: (config) => set({ config }),

  setGameId: (gameId) => set({ gameId }),

  setControlToken: (controlToken) => set({ controlToken }),

  setMusicPlaylist: (musicPlaylist) => set({ musicPlaylist }),

  setStatus: (name, data) => set({ status: createStatus(name, data) }),
  resetStatus: () => set({ status: null }),

  setPlayers: (players) => set({ players }),

  reset: () => set(initialState),
}))
