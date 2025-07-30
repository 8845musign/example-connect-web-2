import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { chatClient } from "../services/chat.service";
import { useChatState } from "./chat/useChatState";
import { useChatConnection } from "./chat/useChatConnection";

export type { DisplayMessage } from "../types/chat";

export function useChat(username: string) {
  const navigate = useNavigate();
  const { state, dispatch } = useChatState();

  useEffect(() => {
    if (!username) {
      navigate("/");
    }
  }, [username, navigate]);

  const handleConnectionError = useCallback(
    (error: string) => {
      console.error("Connection error:", error);
      navigate("/");
    },
    [navigate]
  );

  useChatConnection(username, dispatch, handleConnectionError);

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        await chatClient.sendMessage(content);
      } catch (_) {
        dispatch({ type: "ERROR", error: "Failed to send message" });
      }
    },
    [dispatch]
  );

  return {
    isConnected: state.isConnected,
    messages: state.messages,
    users: state.users,
    error: state.error,
    sendMessage,
  };
}
