import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { chatClient } from "../services/chat.service";
import type { ChatEvent, User } from "../gen/proto/chat/v1/chat_pb";

export interface DisplayMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

export function useChat(username: string) {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const handleChatEvent = useCallback((event: ChatEvent) => {
    switch (event.event.case) {
      case "connectionAccepted": {
        const { userId, activeUsers } = event.event.value;
        currentUserIdRef.current = userId;
        setUsers(activeUsers);
        setIsConnected(true);
        break;
      }

      case "userJoined": {
        const { user } = event.event.value;
        if (user) {
          setUsers((prev) => [...prev, user]);
        }
        break;
      }

      case "userLeft": {
        const { userId } = event.event.value;
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        break;
      }

      case "messageReceived": {
        const msg = event.event.value;
        const displayMsg: DisplayMessage = {
          id: crypto.randomUUID(),
          userId: msg.userId,
          username: msg.username,
          content: msg.content,
          timestamp: new Date(Number(msg.timestamp)),
          isOwn: msg.userId === currentUserIdRef.current,
        };
        setMessages((prev) => [...prev, displayMsg]);
        break;
      }

      case "error": {
        const { message } = event.event.value;
        setError(message);
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        console.log("Attempting to join with username:", username);
        const stream = chatClient.join(username);

        for await (const event of stream) {
          if (cancelled) break;
          console.log("Received event:", event);
          handleChatEvent(event);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Connection error:", err);
          setError(err instanceof Error ? err.message : "Connection failed");
          navigate("/");
        }
      }
    })();

    return () => {
      cancelled = true;
      chatClient.leave();
    };
  }, [username, navigate, handleChatEvent]);

  const sendMessage = useCallback(async (content: string) => {
    try {
      await chatClient.sendMessage(content);
    } catch (_) {
      setError("Failed to send message");
    }
  }, []);

  return {
    isConnected,
    messages,
    users,
    error,
    sendMessage,
  };
}
