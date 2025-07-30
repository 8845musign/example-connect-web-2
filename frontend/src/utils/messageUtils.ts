import type { DisplayMessage } from "../types/chat";

export const createDisplayMessage = (
  msg: {
    userId: string;
    username: string;
    content: string;
    timestamp: bigint;
  },
  currentUserId: string | null
): DisplayMessage => ({
  id: crypto.randomUUID(),
  userId: msg.userId,
  username: msg.username,
  content: msg.content,
  timestamp: new Date(Number(msg.timestamp)),
  isOwn: msg.userId === currentUserId,
});