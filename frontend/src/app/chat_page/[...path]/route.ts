import { createChatPageAssetResponse } from "../chat-page-assets"

export const runtime = "nodejs"

type ChatPageAssetRouteContext = {
  params: Promise<{
    path?: string[]
  }>
}

export async function GET(_request: Request, context: ChatPageAssetRouteContext) {
  const { path = [] } = await context.params

  return createChatPageAssetResponse(path.join("/"))
}
