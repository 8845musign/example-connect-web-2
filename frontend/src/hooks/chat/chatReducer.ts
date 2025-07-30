import type { ChatState, ChatAction } from "../../types/chat";

export const initialChatState: ChatState = {
  isConnected: false,
  messages: [],
  users: [],
  error: null,
  currentUserId: null,
};

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case "CONNECTED":
      return {
        ...state,
        isConnected: true,
        currentUserId: action.userId,
        users: action.users,
        error: null,
      };

    case "USER_JOINED":
      return {
        ...state,
        users: [...state.users, action.user],
      };

    case "USER_LEFT":
      return {
        ...state,
        users: state.users.filter((u) => u.id !== action.userId),
      };

    case "MESSAGE_RECEIVED":
      return {
        ...state,
        messages: [...state.messages, action.message],
      };

    case "ERROR":
      return {
        ...state,
        error: action.error,
      };

    case "DISCONNECT":
      return {
        ...state,
        isConnected: false,
        error: null,
      };

    case "RESET":
      return initialChatState;

    default:
      return state;
  }
};