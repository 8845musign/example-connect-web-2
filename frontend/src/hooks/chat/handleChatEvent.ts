import type { Dispatch } from "react";
import type { ChatEvent } from "../../gen/proto/chat/v1/chat_pb";
import type { ChatAction } from "../../types/chat";
import { createDisplayMessage } from "../../utils/messageUtils";

export const handleChatEvent = (
  event: ChatEvent,
  dispatch: Dispatch<ChatAction>,
  currentUserId: string | null
) => {
  switch (event.event.case) {
    case "connectionAccepted": {
      const { userId, activeUsers } = event.event.value;
      dispatch({
        type: "CONNECTED",
        userId,
        users: activeUsers,
      });
      break;
    }

    case "userJoined": {
      const { user } = event.event.value;
      if (user) {
        dispatch({
          type: "USER_JOINED",
          user,
        });
      }
      break;
    }

    case "userLeft": {
      const { userId } = event.event.value;
      dispatch({
        type: "USER_LEFT",
        userId,
      });
      break;
    }

    case "messageReceived": {
      const displayMsg = createDisplayMessage(
        event.event.value,
        currentUserId
      );
      dispatch({
        type: "MESSAGE_RECEIVED",
        message: displayMsg,
      });
      break;
    }

    case "error": {
      const { message } = event.event.value;
      dispatch({
        type: "ERROR",
        error: message,
      });
      break;
    }
  }
};