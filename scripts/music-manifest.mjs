import fs from "fs"
import path from "path"

export const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".ogg",
  ".wav",
  ".m4a",
  ".flac",
])

export const formatPlaylistName = (id) => {
  if (id === "default") {
    return "General"
  }

  return id
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const isAudioFile = (file) =>
  AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase())

const toTrackUrl = (relativePath) =>
  `/music/custom/${relativePath
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`

const scanAudioFiles = (dir) =>
  fs
    .existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((file) => isAudioFile(file))
        .sort((a, b) => a.localeCompare(b))
    : []

export const buildMusicManifest = (songsDir) => {
  if (!fs.existsSync(songsDir)) {
    return { playlists: [] }
  }

  const playlists = []
  const rootTracks = scanAudioFiles(songsDir).map((file) =>
    toTrackUrl(file),
  )

  if (rootTracks.length > 0) {
    playlists.push({
      id: "default",
      name: formatPlaylistName("default"),
      tracks: rootTracks,
    })
  }

  const entries = fs
    .readdirSync(songsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))

  for (const entry of entries) {
    const tracks = scanAudioFiles(path.join(songsDir, entry.name)).map((file) =>
      toTrackUrl(path.join(entry.name, file)),
    )

    if (tracks.length === 0) {
      continue
    }

    playlists.push({
      id: entry.name,
      name: formatPlaylistName(entry.name),
      tracks,
    })
  }

  return { playlists }
}
