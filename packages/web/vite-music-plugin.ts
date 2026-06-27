import fs from "fs"
import path from "path"
import { createRequire } from "module"
import { fileURLToPath } from "url"
import type { Plugin } from "vite"

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
)
const require = createRequire(import.meta.url)
const { buildMusicManifest } = require(
  path.join(rootDir, "scripts/music-manifest.mjs"),
) as {
  buildMusicManifest: (songsDir: string) => {
    playlists: Array<{ id: string; name: string; tracks: string[] }>
  }
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
        res.end(JSON.stringify(buildMusicManifest(songsDir)))
        return
      }

      const relative = decodeURIComponent(
        req.url.replace("/music/custom/", "").split("?")[0] ?? "",
      )
      const filePath = path.resolve(songsDir, relative)
      const normalizedSongsDir = path.resolve(songsDir)

      if (
        !filePath.startsWith(`${normalizedSongsDir}${path.sep}`) &&
        filePath !== normalizedSongsDir
      ) {
        next()
        return
      }

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
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
