import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import { chatClient } from "../../services/chat.service";
import type { ChatAction } from "../../types/chat";
import { handleChatEvent } from "./handleChatEvent";

export const useChatConnection = (
  username: string,
  dispatch: Dispatch<ChatAction>,
  onError: (error: string) => void
) => {
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!username) return;

    let cancelled = false;

    (async () => {
      try {
        console.log("Attempting to join with username:", username);
        const stream = chatClient.join(username);

        for await (const event of stream) {
          if (cancelled) break;
          console.log("Received event:", event);
          
          // Update currentUserId when connection is accepted
          if (event.event.case === "connectionAccepted") {
            currentUserIdRef.current = event.event.value.userId;
          }
          
          handleChatEvent(event, dispatch, currentUserIdRef.current);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Connection error:", err);
          const errorMessage = err instanceof Error ? err.message : "Connection failed";
          dispatch({ type: "ERROR", error: errorMessage });
          onError(errorMessage);
        }
      }
    })();

    return () => {
      cancelled = true;
      chatClient.leave();
      dispatch({ type: "DISCONNECT" });
    };
  }, [username, dispatch, onError]);
};