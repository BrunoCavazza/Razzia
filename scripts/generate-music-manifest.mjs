import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { buildMusicManifest } from "./music-manifest.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const songsDir = path.join(root, "songs")

if (!fs.existsSync(songsDir)) {
  fs.mkdirSync(songsDir, { recursive: true })
}

const manifest = buildMusicManifest(songsDir)
const outPath = path.join(songsDir, "manifest.json")

fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2))

const trackCount = manifest.playlists.reduce(
  (total, playlist) => total + playlist.tracks.length,
  0,
)

console.log(
  `Music manifest: ${manifest.playlists.length} playlist(s), ${trackCount} track(s) -> ${outPath}`,
)
