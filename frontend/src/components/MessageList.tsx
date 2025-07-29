import { useEffect, useRef } from "react";
import type { DisplayMessage } from "../hooks/useChat";

interface MessageListProps {
  messages: DisplayMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  return (
    <div className="message-list">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`message ${msg.isOwn ? "message-own" : "message-other"}`}
        >
          <div className="message-header">
            <span className="message-username">{msg.username}</span>
            <span className="message-time">
              {msg.timestamp.toLocaleTimeString()}
            </span>
          </div>
          <div className="message-content">{msg.content}</div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}