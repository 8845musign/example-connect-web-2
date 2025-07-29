import { useState, type FormEvent } from "react";

interface MessageInputProps {
  onSend: (content: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [message, setMessage] = useState("");
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message);
      setMessage("");
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="message-input">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="メッセージを入力..."
        className="message-input-field"
      />
      <button type="submit" disabled={!message.trim()}>
        送信
      </button>
    </form>
  );
}