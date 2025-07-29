# Connect RPCチャットアプリケーション 全体設計書

## 1. 概要

Connect RPC v2の双方向ストリーミング機能を使用したリアルタイムチャットアプリケーションを実装します。ユーザーは名前を入力して入室し、単一のチャットルームでメッセージをやり取りできます。

## 2. システムアーキテクチャ

### 2.1 技術スタック

**バックエンド**
- Node.js (v18+)
- TypeScript
- @connectrpc/connect (v2.0.0+)
- @connectrpc/connect-node (v2.0.0+)
- @bufbuild/protobuf (v2.2.0+)
- @bufbuild/protoc-gen-es (v2.2.0+)

**フロントエンド**
- React 18
- React Router v7 (Framework Mode - SPA)
- TypeScript
- Vite (React Routerプラグイン経由)
- @connectrpc/connect (v2.0.0+)
- @connectrpc/connect-web (v2.0.0+)
- @bufbuild/protobuf (v2.2.0+)
- @react-router/dev

**開発ツール**
- Buf CLI
- nodemon (開発時の自動リロード)
- concurrently (複数プロセスの同時実行)

**共通**
- Protocol Buffers v3
- Buf (スキーマ管理・コード生成)

### 2.2 通信方式

- **プロトコル**: Connect RPC (HTTP/1.1 + Connect Protocol)
- **メッセージング**: 双方向ストリーミング RPC
- **シリアライゼーション**: Protocol Buffers (バイナリ形式)

### 2.3 プロジェクト構成

```
connect-web-chat/
├── buf.yaml              # Bufプロジェクト設定
├── buf.gen.yaml          # コード生成設定
├── proto/
│   └── chat/
│       └── v1/
│           └── chat.proto # サービス定義
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── server.ts     # エントリポイント
│   │   ├── services/
│   │   │   └── chat.ts   # チャットサービス実装
│   │   └── gen/          # 生成されたコード
│   │       └── chat/
│   │           └── v1/
│   │               ├── chat_pb.ts
│   │               └── chat_connect.ts
│   └── dist/             # ビルド出力
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── react-router.config.ts  # React Router設定
│   ├── src/
│   │   ├── entry.client.tsx     # クライアントエントリポイント
│   │   ├── root.tsx             # ルートレイアウト
│   │   ├── routes.ts            # ルート定義
│   │   ├── routes/              # ルートコンポーネント
│   │   │   ├── index.tsx        # ログイン画面
│   │   │   └── chat/
│   │   │       ├── layout.tsx   # チャットレイアウト
│   │   │       └── room.tsx     # チャットルーム
│   │   ├── components/
│   │   │   ├── MessageList.tsx
│   │   │   ├── UserList.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── hooks/
│   │   │   ├── useChat.ts       # チャット接続管理
│   │   │   └── useReconnect.ts
│   │   ├── services/
│   │   │   └── chat.service.ts  # Connect RPCクライアント
│   │   ├── gen/                 # 生成されたコード
│   │   │   └── chat/
│   │   │       └── v1/
│   │   │           ├── chat_pb.ts
│   │   │           └── chat_connect.ts
│   │   └── styles/
│   │       └── app.css
│   ├── dist/                    # ビルド出力
│   └── .react-router/           # React Router生成ファイル
├── docs/
│   ├── design.md         # 本設計書
│   └── tasks.md          # タスクリスト
├── scripts/
│   ├── dev.sh            # 開発サーバー起動
│   └── generate.sh       # コード生成
├── .gitignore
└── README.md
```

## 3. Protocol Buffers定義

```protobuf
syntax = "proto3";

package chat.v1;

// チャットサービス定義
service ChatService {
  // 双方向ストリーミングRPC
  rpc Chat(stream ChatMessage) returns (stream ChatEvent);
}

// クライアントからサーバーへのメッセージ
message ChatMessage {
  oneof message {
    JoinRequest join = 1;
    SendMessageRequest send_message = 2;
    LeaveRequest leave = 3;
  }
}

// 入室リクエスト
message JoinRequest {
  string username = 1;
}

// メッセージ送信リクエスト
message SendMessageRequest {
  string content = 1;
}

// 退室リクエスト
message LeaveRequest {}

// サーバーからクライアントへのイベント
message ChatEvent {
  oneof event {
    UserJoinedEvent user_joined = 1;
    UserLeftEvent user_left = 2;
    MessageReceivedEvent message_received = 3;
    ErrorEvent error = 4;
    ConnectionAcceptedEvent connection_accepted = 5;
  }
}

// 接続承認イベント
message ConnectionAcceptedEvent {
  string user_id = 1;
  repeated User active_users = 2;
}

// ユーザー入室イベント
message UserJoinedEvent {
  User user = 1;
}

// ユーザー退室イベント
message UserLeftEvent {
  string user_id = 1;
}

// メッセージ受信イベント
message MessageReceivedEvent {
  string user_id = 1;
  string username = 2;
  string content = 3;
  int64 timestamp = 4;
}

// エラーイベント
message ErrorEvent {
  string message = 1;
  ErrorCode code = 2;
}

// エラーコード
enum ErrorCode {
  ERROR_CODE_UNSPECIFIED = 0;
  ERROR_CODE_USERNAME_TAKEN = 1;
  ERROR_CODE_INVALID_MESSAGE = 2;
}

// ユーザー情報
message User {
  string id = 1;
  string username = 2;
}
```

## 4. バックエンド設計

### 4.1 サーバー構成

```typescript
// server.ts
import { ConnectRouter } from "@connectrpc/connect";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { ChatService } from "./gen/chat/v1/chat_pb";
import { chatServiceImpl } from "./services/chat";
import * as http from "http";
import { cors } from "@connectrpc/connect-node";

// ルーター定義
const routes = (router: ConnectRouter) => {
  router.service(ChatService, chatServiceImpl);
};

// CORS設定（開発環境用）
const corsOptions = {
  origin: "http://localhost:5173", // Viteのデフォルトポート
  credentials: true,
};

const server = http.createServer(
  connectNodeAdapter({
    routes,
    cors: corsOptions,
  })
);

server.listen(8080, () => {
  console.log("Chat server listening on http://localhost:8080");
});
```

### 4.2 チャットサービス実装

```typescript
// services/chat.ts
import { ConnectError, Code } from "@connectrpc/connect";
import { ChatService } from "../gen/chat/v1/chat_pb";
import type { 
  ChatMessage, 
  ChatEvent,
  User 
} from "../gen/chat/v1/chat_pb";

interface ChatSession {
  id: string;
  userId: string;
  username: string;
  eventQueue: ChatEvent[];
  controller: ReadableStreamDefaultController<ChatEvent>;
}

class ChatManager {
  private sessions = new Map<string, ChatSession>();
  private users = new Map<string, User>();
  
  // セッション作成
  createSession(username: string): ChatSession {
    const userId = crypto.randomUUID();
    const user: User = { id: userId, username };
    
    // ユーザー名重複チェック
    for (const [_, u] of this.users) {
      if (u.username === username) {
        throw new ConnectError(
          "Username already taken",
          Code.AlreadyExists
        );
      }
    }
    
    this.users.set(userId, user);
    
    const session: ChatSession = {
      id: crypto.randomUUID(),
      userId,
      username,
      eventQueue: [],
      controller: null!, // 後で設定
    };
    
    this.sessions.set(session.id, session);
    return session;
  }
  
  // 全セッションにイベントをブロードキャスト
  broadcast(event: ChatEvent, excludeSessionId?: string) {
    for (const [sessionId, session] of this.sessions) {
      if (sessionId !== excludeSessionId) {
        session.controller.enqueue(event);
      }
    }
  }
  
  // セッション削除
  removeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.users.delete(session.userId);
      this.sessions.delete(sessionId);
      
      // 退室をブロードキャスト
      this.broadcast({
        event: {
          case: "userLeft",
          value: { userId: session.userId }
        }
      });
    }
  }
  
  getActiveUsers(): User[] {
    return Array.from(this.users.values());
  }
}

const chatManager = new ChatManager();

export const chatServiceImpl: typeof ChatService.methods = {
  async *chat(stream, context) {
    let session: ChatSession | null = null;
    
    // レスポンスストリームの作成
    const responseStream = new ReadableStream<ChatEvent>({
      start(controller) {
        // セッションが作成されたらcontrollerを設定
        if (session) {
          session.controller = controller;
        }
      },
      cancel() {
        // クリーンアップ
        if (session) {
          chatManager.removeSession(session.id);
        }
      }
    });
    
    // 入力ストリームの処理
    (async () => {
      try {
        for await (const message of stream) {
          switch (message.message.case) {
            case "join": {
              const { username } = message.message.value;
              
              // セッション作成
              session = chatManager.createSession(username);
              
              // ReadableStreamのcontrollerを設定
              const reader = responseStream.getReader();
              const { value, done } = await reader.read();
              reader.releaseLock();
              
              // 接続承認イベント送信
              session.controller.enqueue({
                event: {
                  case: "connectionAccepted",
                  value: {
                    userId: session.userId,
                    activeUsers: chatManager.getActiveUsers()
                  }
                }
              });
              
              // 入室をブロードキャスト
              chatManager.broadcast({
                event: {
                  case: "userJoined",
                  value: {
                    user: { id: session.userId, username }
                  }
                }
              }, session.id);
              break;
            }
            
            case "sendMessage": {
              if (!session) {
                throw new ConnectError(
                  "Not joined to chat",
                  Code.FailedPrecondition
                );
              }
              
              const { content } = message.message.value;
              
              // メッセージをブロードキャスト（送信者含む）
              chatManager.broadcast({
                event: {
                  case: "messageReceived",
                  value: {
                    userId: session.userId,
                    username: session.username,
                    content,
                    timestamp: BigInt(Date.now())
                  }
                }
              });
              break;
            }
            
            case "leave": {
              if (session) {
                chatManager.removeSession(session.id);
                session.controller.close();
              }
              return;
            }
          }
        }
      } catch (error) {
        // エラーハンドリング
        if (session?.controller) {
          session.controller.enqueue({
            event: {
              case: "error",
              value: {
                message: error.message,
                code: "ERROR_CODE_UNSPECIFIED"
              }
            }
          });
        }
      } finally {
        // クリーンアップ
        if (session) {
          chatManager.removeSession(session.id);
        }
      }
    })();
    
    // レスポンスストリームを返す
    yield* responseStream;
  }
};
```

### 4.3 セッション管理の詳細

- **セッションID**: 各接続に一意のUUIDを割り当て
- **ユーザーID**: 各ユーザーに一意のUUIDを割り当て
- **イベントキュー**: ReadableStreamを使用した非同期イベント配信
- **ブロードキャスト**: 全アクティブセッションへの効率的なメッセージ配信
- **メモリリーク対策**: 
  - 接続終了時の確実なクリーンアップ
  - WeakMapの使用検討（将来的な最適化）

## 5. フロントエンド設計

### 5.1 React Router Framework Mode設定

```typescript
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  server: {
    port: 5173,
    proxy: {
      // Connect RPCエンドポイントのプロキシ設定
      '/chat.v1.ChatService': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
});
```

```typescript
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src",
  ssr: false, // SPAモード
} satisfies Config;
```

### 5.2 ルート構造

```typescript
// src/routes.ts
import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("./routes/index.tsx"), // ログイン画面
  route("chat", "./routes/chat/layout.tsx", [
    index("./routes/chat/room.tsx"), // チャットルーム
  ]),
] satisfies RouteConfig;
```

### 5.3 エントリポイント

```typescript
// src/entry.client.tsx
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  );
});
```

```typescript
// src/root.tsx
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}
```

### 5.4 チャットサービス

```typescript
// src/services/chat.service.ts
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { ChatService } from "../gen/chat/v1/chat_pb";
import { create } from "@bufbuild/protobuf";
import type { ChatMessage, ChatEvent } from "../gen/chat/v1/chat_pb";

export class ChatClient {
  private client;
  private stream: AsyncIterable<ChatEvent> | null = null;
  
  constructor() {
    const transport = createConnectTransport({
      baseUrl: "", // 同一オリジンなのでプロキシ経由
    });
    this.client = createClient(ChatService, transport);
  }
  
  async connect(username: string): Promise<AsyncIterable<ChatEvent>> {
    this.stream = this.client.chat();
    
    // 入室リクエスト
    await this.stream.send(create(ChatMessageSchema, {
      message: {
        case: "join",
        value: { username }
      }
    }));
    
    return this.stream;
  }
  
  async sendMessage(content: string): Promise<void> {
    if (!this.stream) throw new Error("Not connected");
    
    await this.stream.send(create(ChatMessageSchema, {
      message: {
        case: "sendMessage",
        value: { content }
      }
    }));
  }
  
  async disconnect(): Promise<void> {
    if (this.stream) {
      await this.stream.send(create(ChatMessageSchema, {
        message: {
          case: "leave",
          value: {}
        }
      }));
      this.stream = null;
    }
  }
}

// シングルトンインスタンス
export const chatClient = new ChatClient();
```

### 5.5 カスタムフック

```typescript
// src/hooks/useChat.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { chatClient } from "../services/chat.service";
import type { ChatEvent, User } from "../gen/chat/v1/chat_pb";

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
        const stream = await chatClient.connect(username);
        
        for await (const event of stream) {
          if (cancelled) break;
          handleChatEvent(event);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Connection failed");
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
        setUsers(prev => [...prev, user]);
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
```

### 5.6 ルートコンポーネント

```typescript
// src/routes/index.tsx (ログイン画面)
import { Form, useNavigation, useActionData } from "react-router";
import { Route } from "./+types/index";

export async function clientAction({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  
  if (!username?.trim()) {
    return { error: "ユーザー名を入力してください" };
  }
  
  // ユーザー名をセッションストレージに保存
  sessionStorage.setItem("username", username);
  
  // チャット画面へリダイレクト
  throw new Response(null, {
    status: 302,
    headers: { Location: "/chat" },
  });
}

export default function LoginRoute() {
  const actionData = useActionData<typeof clientAction>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  return (
    <div className="login-container">
      <div className="login-box">
        <h1>チャットルームへようこそ</h1>
        <Form method="post">
          <div className="form-group">
            <label htmlFor="username">ユーザー名</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="名前を入力してください"
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          {actionData?.error && (
            <div className="error-message">{actionData.error}</div>
          )}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "接続中..." : "入室"}
          </button>
        </Form>
      </div>
    </div>
  );
}
```

```typescript
// src/routes/chat/layout.tsx (チャットレイアウト)
import { Outlet, useNavigate } from "react-router";
import { useEffect } from "react";
import { Route } from "./+types/layout";

export async function clientLoader() {
  const username = sessionStorage.getItem("username");
  
  if (!username) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/" },
    });
  }
  
  return { username };
}

export default function ChatLayout({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    sessionStorage.removeItem("username");
    navigate("/");
  };
  
  return (
    <div className="chat-layout">
      <header className="chat-header">
        <h1>Connect RPC Chat</h1>
        <button onClick={handleLogout} className="logout-button">
          退室
        </button>
      </header>
      <Outlet context={{ username: loaderData.username }} />
    </div>
  );
}
```

```typescript
// src/routes/chat/room.tsx (チャットルーム)
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
```

### 5.7 UIコンポーネント

```typescript
// src/components/MessageList.tsx
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
```

```typescript
// src/components/UserList.tsx
import type { User } from "../gen/chat/v1/chat_pb";

interface UserListProps {
  users: User[];
}

export function UserList({ users }: UserListProps) {
  return (
    <div className="user-list">
      <h3>オンラインユーザー ({users.length})</h3>
      <ul>
        {users.map((user) => (
          <li key={user.id} className="user-item">
            <span className="user-status">●</span>
            <span className="user-name">{user.username}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```typescript
// src/components/MessageInput.tsx
import { useState, FormEvent } from "react";

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
```

## 6. エラーハンドリング

### 6.1 接続エラー
- ネットワークエラー
- サーバー接続失敗
- 自動再接続の実装

### 6.2 アプリケーションエラー
- ユーザー名重複
- 不正なメッセージ
- セッションタイムアウト

### 6.3 ユーザーへのフィードバック
- エラーメッセージの表示
- 接続状態の可視化
- リトライオプション

## 7. セキュリティ考慮事項

- 入力値のバリデーション
- XSS対策（React自動エスケープ）
- メッセージ長の制限
- レート制限（将来的な実装）

## 8. 拡張可能性

将来的な機能追加を考慮した設計：
- 複数ルーム対応
- ユーザー認証
- メッセージ履歴保存
- ファイル送信
- 絵文字リアクション
- タイピングインジケーター