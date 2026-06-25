import { readFile } from "node:fs/promises"
import path from "node:path"

const CHAT_PAGE_DIR = path.resolve(process.cwd(), "src", "chat_page")

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

function resolveChatPageAsset(assetPath: string) {
  const filePath = path.resolve(CHAT_PAGE_DIR, assetPath)
  const relativePath = path.relative(CHAT_PAGE_DIR, filePath)

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null
  }

  return filePath
}

export async function createChatPageAssetResponse(assetPath: string) {
  const filePath = resolveChatPageAsset(assetPath)

  if (!filePath) {
    return new Response("Not found", { status: 404 })
  }

  try {
    const body = await readFile(filePath)
    const extension = path.extname(filePath).toLowerCase()

    return new Response(body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("Not found", { status: 404 })
    }

    throw error
  }
}
