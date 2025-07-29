import { useEffect, useState, useCallback } from "react";
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }
    
    let cancelled = false;
    
    (async () => {
      try {
        const stream = chatClient.connect(username);
        
        for await (const event of stream) {
          if (cancelled) break;
          handleChatEvent(event);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Connection failed");
          navigate("/");
        }
      }
    })();
    
    return () => {
      cancelled = true;
      chatClient.disconnect();
    };
  }, [username, navigate]);
  
  const handleChatEvent = useCallback((event: ChatEvent) => {
    switch (event.event.case) {
      case "connectionAccepted": {
        const { userId, activeUsers } = event.event.value;
        setCurrentUserId(userId);
        setUsers(activeUsers);
        setIsConnected(true);
        break;
      }
      
      case "userJoined": {
        const { user } = event.event.value;
        if (user) {
          setUsers(prev => [...prev, user]);
        }
        break;
      }
      
      case "userLeft": {
        const { userId } = event.event.value;
        setUsers(prev => prev.filter(u => u.id !== userId));
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
          isOwn: msg.userId === currentUserId
        };
        setMessages(prev => [...prev, displayMsg]);
        break;
      }
      
      case "error": {
        const { message } = event.event.value;
        setError(message);
        break;
      }
    }
  }, [currentUserId]);
  
  const sendMessage = useCallback(async (content: string) => {
    try {
      await chatClient.sendMessage(content);
    } catch (err) {
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