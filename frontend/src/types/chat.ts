import type { User } from "../gen/proto/chat/v1/chat_pb";

export interface DisplayMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

export interface ChatState {
  isConnected: boolean;
  messages: DisplayMessage[];
  users: User[];
  error: string | null;
  currentUserId: string | null;
}

export type ChatAction =
  | { type: "CONNECTED"; userId: string; users: User[] }
  | { type: "USER_JOINED"; user: User }
  | { type: "USER_LEFT"; userId: string }
  | { type: "MESSAGE_RECEIVED"; message: DisplayMessage }
  | { type: "ERROR"; error: string }
  | { type: "DISCONNECT" }
  | { type: "RESET" };