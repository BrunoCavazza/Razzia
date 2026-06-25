import fs from "fs"
import path from "path"
import type { Plugin } from "vite"

const AUDIO_EXT = new Set([".mp3", ".ogg", ".wav", ".m4a", ".flac"])

const buildManifest = (songsDir: string) => {
  if (!fs.existsSync(songsDir)) {
    return { tracks: [] as string[] }
  }

  const tracks = fs
    .readdirSync(songsDir)
    .filter((file) => AUDIO_EXT.has(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => `/music/custom/${encodeURIComponent(file)}`)

  return { tracks }
}

export const musicPlugin = (songsDir: string): Plugin => {
  const attach = (server: { middlewares: { use: Function } }) => {
    server.middlewares.use((req: { url?: string }, res: any, next: () => void) => {
      if (!req.url?.startsWith("/music/custom")) {
        next()
        return
      }

      if (req.url === "/music/custom/manifest.json") {
        res.setHeader("Content-Type", "application/json")
        res.end(JSON.stringify(buildManifest(songsDir)))
        return
      }

      const relative = decodeURIComponent(
        req.url.replace("/music/custom/", ""),
      )
      const filePath = path.join(songsDir, relative)

      if (
        !filePath.startsWith(songsDir) ||
        !fs.existsSync(filePath) ||
        !fs.statSync(filePath).isFile()
      ) {
        next()
        return
      }

      res.setHeader("Content-Type", "audio/mpeg")
      fs.createReadStream(filePath).pipe(res)
    })
  }

  return {
    name: "razzia-music",
    configureServer: attach,
    configurePreviewServer: attach,
  }
}
