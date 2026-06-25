import { handleChatPost } from "@/bff/chat/route";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = handleChatPost;
