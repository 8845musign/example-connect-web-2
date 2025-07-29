import { ConnectError, Code } from "@connectrpc/connect";
import { create } from "@bufbuild/protobuf";
import { 
  ChatMessage, 
  ChatEvent,
  ChatEventSchema,
  User,
  UserSchema,
  ConnectionAcceptedEventSchema,
  UserJoinedEventSchema,
  UserLeftEventSchema,
  MessageReceivedEventSchema,
  ErrorEventSchema,
  ErrorCode
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
  
  createSession(username: string): ChatSession {
    const userId = crypto.randomUUID();
    const user = create(UserSchema, { id: userId, username });
    
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
    return session;
  }
  
  broadcast(event: ChatEvent, excludeSessionId?: string) {
    for (const [sessionId, session] of this.sessions) {
      if (sessionId !== excludeSessionId && session.controller) {
        session.controller.enqueue(event);
      }
    }
  }
  
  removeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.users.delete(session.userId);
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
  
  getActiveUsers(): User[] {
    return Array.from(this.users.values());
  }
}

const chatManager = new ChatManager();

export const chatServiceImpl = {
  async *chat(stream: AsyncIterable<ChatMessage>) {
    let session: ChatSession | null = null;
    
    const responseStream = new ReadableStream<ChatEvent>({
      start(controller) {
        if (session) {
          session.controller = controller;
        }
      },
      cancel() {
        if (session) {
          chatManager.removeSession(session.id);
        }
      }
    });
    
    
    (async () => {
      try {
        for await (const message of stream) {
          switch (message.message.case) {
            case "join": {
              const { username } = message.message.value;
              
              try {
                session = chatManager.createSession(username);
                
                if (session.controller === null && responseStream) {
                  const reader = responseStream.getReader();
                  reader.releaseLock();
                  
                  await new Promise<void>((resolve) => {
                    setTimeout(() => {
                      if (session && session.controller) {
                        resolve();
                      }
                    }, 10);
                  });
                }
                
                if (session.controller) {
                  const connectionAcceptedEvent = create(ChatEventSchema, {
                    event: {
                      case: "connectionAccepted",
                      value: create(ConnectionAcceptedEventSchema, {
                        userId: session.userId,
                        activeUsers: chatManager.getActiveUsers()
                      })
                    }
                  });
                  
                  session.controller.enqueue(connectionAcceptedEvent);
                  
                  const userJoinedEvent = create(ChatEventSchema, {
                    event: {
                      case: "userJoined",
                      value: create(UserJoinedEventSchema, {
                        user: create(UserSchema, { id: session.userId, username })
                      })
                    }
                  });
                  
                  chatManager.broadcast(userJoinedEvent, session.id);
                }
              } catch (error) {
                if (session?.controller) {
                  const errorEvent = create(ChatEventSchema, {
                    event: {
                      case: "error",
                      value: create(ErrorEventSchema, {
                        message: error instanceof Error ? error.message : "Join failed",
                        code: ErrorCode.USERNAME_TAKEN
                      })
                    }
                  });
                  session.controller.enqueue(errorEvent);
                }
                throw error;
              }
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
              
              const messageReceivedEvent = create(ChatEventSchema, {
                event: {
                  case: "messageReceived",
                  value: create(MessageReceivedEventSchema, {
                    userId: session.userId,
                    username: session.username,
                    content,
                    timestamp: BigInt(Date.now())
                  })
                }
              });
              
              chatManager.broadcast(messageReceivedEvent);
              break;
            }
            
            case "leave": {
              if (session) {
                chatManager.removeSession(session.id);
              }
              return;
            }
          }
        }
      } catch (error) {
        if (session?.controller) {
          const errorEvent = create(ChatEventSchema, {
            event: {
              case: "error",
              value: create(ErrorEventSchema, {
                message: error instanceof Error ? error.message : "Unknown error",
                code: ErrorCode.UNSPECIFIED
              })
            }
          });
          session.controller.enqueue(errorEvent);
        }
      } finally {
        if (session) {
          chatManager.removeSession(session.id);
        }
      }
    })();
    
    const reader = responseStream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  }
};