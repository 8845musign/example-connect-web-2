import { useReducer } from "react";
import { chatReducer, initialChatState } from "./chatReducer";

export const useChatState = () => {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  return { state, dispatch };
};