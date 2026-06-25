import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const songsDir = path.join(root, "songs")
const extensions = new Set([".mp3", ".ogg", ".wav", ".m4a", ".flac"])

if (!fs.existsSync(songsDir)) {
  fs.mkdirSync(songsDir, { recursive: true })
}

const tracks = fs
  .readdirSync(songsDir)
  .filter((file) => extensions.has(path.extname(file).toLowerCase()))
  .sort((a, b) => a.localeCompare(b))
  .map((file) => `/music/custom/${encodeURIComponent(file)}`)

const manifest = { tracks }
const outPath = path.join(songsDir, "manifest.json")

fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2))
console.log(`Music manifest: ${tracks.length} track(s) -> ${outPath}`)
