import { ConnectError, Code, HandlerContext } from "@connectrpc/connect";
import { create } from "@bufbuild/protobuf";
import { 
  ChatEvent,
  ChatEventSchema,
  User,
  UserSchema,
  ConnectionAcceptedEventSchema,
  UserJoinedEventSchema,
  UserLeftEventSchema,
  MessageReceivedEventSchema,
  ErrorEventSchema,
  ErrorCode,
  JoinRequest,
  SendMessageRequest,
  SendMessageResponse,
  SendMessageResponseSchema,
  LeaveRequest,
  LeaveResponse,
  LeaveResponseSchema
} from "../gen/proto/chat/v1/chat_pb.js";

interface ChatSession {
  id: string;
  userId: string;
  username: string;
  controller: ReadableStreamDefaultController<ChatEvent> | null;
}

class ChatManager {
  private sessions = new Map<string, ChatSession>();
  private users = new Map<string, User>();
  private userSessionMap = new Map<string, string>(); // userId -> sessionId
  
  createSession(username: string): ChatSession {
    const userId = crypto.randomUUID();
    const user = create(UserSchema, { id: userId, username });
    
    // ユーザー名の重複チェック
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
      controller: null,
    };
    
    this.sessions.set(session.id, session);
    this.userSessionMap.set(userId, session.id);
    
    return session;
  }
  
  broadcast(event: ChatEvent, excludeUserId?: string) {
    for (const [sessionId, session] of this.sessions) {
      if (session.userId !== excludeUserId && session.controller) {
        try {
          session.controller.enqueue(event);
        } catch (error) {
          console.error(`Failed to send event to session ${sessionId}:`, error);
        }
      }
    }
  }
  
  removeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.users.delete(session.userId);
      this.userSessionMap.delete(session.userId);
      this.sessions.delete(sessionId);
      
      const userLeftEvent = create(ChatEventSchema, {
        event: {
          case: "userLeft",
          value: create(UserLeftEventSchema, { userId: session.userId })
        }
      });
      
      this.broadcast(userLeftEvent);
      
      if (session.controller) {
        session.controller.close();
      }
    }
  }
  
  getSessionByUserId(userId: string): ChatSession | undefined {
    const sessionId = this.userSessionMap.get(userId);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }
  
  getActiveUsers(): User[] {
    return Array.from(this.users.values());
  }
}

const chatManager = new ChatManager();

export const chatServiceImpl = {
  // 入室（サーバーストリーミング）
  async *join(req: JoinRequest, _context: HandlerContext) {
    console.log("Join request received for username:", req.username);
    
    let session: ChatSession | null = null;
    
    try {
      session = chatManager.createSession(req.username);
      console.log(`Session created for ${req.username} with userId: ${session.userId}`);
      
      // ストリームを作成
      const stream = new ReadableStream<ChatEvent>({
        start(controller) {
          if (session) {
            session.controller = controller;
            
            // 接続承認イベントを送信
            const connectionAcceptedEvent = create(ChatEventSchema, {
              event: {
                case: "connectionAccepted",
                value: create(ConnectionAcceptedEventSchema, {
                  userId: session.userId,
                  activeUsers: chatManager.getActiveUsers()
                })
              }
            });
            
            controller.enqueue(connectionAcceptedEvent);
            console.log(`Sent connectionAccepted event to ${session.username}`);
            
            // 他のユーザーに入室を通知
            const userJoinedEvent = create(ChatEventSchema, {
              event: {
                case: "userJoined",
                value: create(UserJoinedEventSchema, {
                  user: create(UserSchema, { id: session.userId, username: session.username })
                })
              }
            });
            
            chatManager.broadcast(userJoinedEvent, session.userId);
            console.log(`Broadcasted userJoined event for ${session.username}`);
          }
        },
        cancel() {
          console.log(`Stream cancelled for session ${session?.id}`);
          if (session) {
            chatManager.removeSession(session.id);
          }
        }
      });
      
      // ストリームから読み取って返す
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
      
    } catch (error) {
      console.error("Error in join:", error);
      
      // ユーザー名が既に使用されている場合
      if (error instanceof ConnectError && error.code === Code.AlreadyExists) {
        const errorEvent = create(ChatEventSchema, {
          event: {
            case: "error",
            value: create(ErrorEventSchema, {
              message: "Username already taken",
              code: ErrorCode.USERNAME_TAKEN
            })
          }
        });
        yield errorEvent;
      }
      
      throw error;
    }
  },
  
  // メッセージ送信（Unary RPC）
  sendMessage(req: SendMessageRequest, context: HandlerContext): SendMessageResponse {
    console.log("SendMessage request received:", req.content);
    
    // コンテキストからユーザー情報を取得（実際の実装では認証情報から取得）
    // ここでは簡易的にリクエストヘッダーから取得することを想定
    const userId = context.requestHeader.get("x-user-id");
    
    if (!userId) {
      throw new ConnectError(
        "Not authenticated",
        Code.Unauthenticated
      );
    }
    
    const session = chatManager.getSessionByUserId(userId);
    if (!session) {
      throw new ConnectError(
        "Not joined to chat",
        Code.FailedPrecondition
      );
    }
    
    // メッセージ受信イベントを全員にブロードキャスト
    const messageReceivedEvent = create(ChatEventSchema, {
      event: {
        case: "messageReceived",
        value: create(MessageReceivedEventSchema, {
          userId: session.userId,
          username: session.username,
          content: req.content,
          timestamp: BigInt(Date.now())
        })
      }
    });
    
    chatManager.broadcast(messageReceivedEvent);
    console.log(`Broadcasted message from ${session.username}`);
    
    return create(SendMessageResponseSchema, { success: true });
  },
  
  // 退室（Unary RPC）
  leave(_req: LeaveRequest, context: HandlerContext): LeaveResponse {
    console.log("Leave request received");
    
    const userId = context.requestHeader.get("x-user-id");
    
    if (!userId) {
      throw new ConnectError(
        "Not authenticated",
        Code.Unauthenticated
      );
    }
    
    const session = chatManager.getSessionByUserId(userId);
    if (session) {
      chatManager.removeSession(session.id);
      console.log(`User ${session.username} left the chat`);
    }
    
    return create(LeaveResponseSchema, { success: true });
  }
};