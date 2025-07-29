import { useOutletContext } from "react-router";
import { useChat } from "../../hooks/useChat";
import { MessageList } from "../../components/MessageList";
import { UserList } from "../../components/UserList";
import { MessageInput } from "../../components/MessageInput";

export default function ChatRoom() {
  const { username } = useOutletContext<{ username: string }>();
  const { isConnected, messages, users, error, sendMessage } = useChat(username);
  
  if (!isConnected) {
    return <div className="connecting">接続中...</div>;
  }
  
  return (
    <div className="chat-room">
      <aside className="users-sidebar">
        <UserList users={users} />
      </aside>
      <main className="chat-main">
        <MessageList messages={messages} />
        <MessageInput onSend={sendMessage} />
      </main>
      {error && (
        <div className="error-toast">{error}</div>
      )}
    </div>
  );
}