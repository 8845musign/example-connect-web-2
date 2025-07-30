import { vi, type Mock } from 'vitest';
import type { Client, CallOptions } from '@connectrpc/connect';
import type { MessageInitShape } from '@bufbuild/protobuf';
import { create } from '@bufbuild/protobuf';
import {
  ChatService,
  ChatEventSchema,
  ConnectionAcceptedEventSchema,
  UserJoinedEventSchema,
  MessageReceivedEventSchema,
  UserSchema,
  SendMessageResponseSchema,
  LeaveResponseSchema,
  type ChatEvent,
  type User,
  type JoinRequest,
  type SendMessageRequest,
  type SendMessageResponse,
  type LeaveRequest,
  type LeaveResponse,
} from '../../gen/proto/chat/v1/chat_pb';

// ヘルパー関数を分離
export const mockHelpers = {
  // Helper to create mock streaming responses
  createMockStream(events: ChatEvent[]): AsyncIterable<ChatEvent> {
    return (async function* () {
      for (const event of events) {
        yield event;
      }
    })();
  },
  
  // Helper to create common events
  createConnectionAcceptedEvent(userId: string, activeUsers: User[]): ChatEvent {
    return create(ChatEventSchema, {
      event: {
        case: "connectionAccepted",
        value: create(ConnectionAcceptedEventSchema, {
          userId,
          activeUsers
        })
      }
    });
  },
  
  createUserJoinedEvent(user: User): ChatEvent {
    return create(ChatEventSchema, {
      event: {
        case: "userJoined",
        value: create(UserJoinedEventSchema, { user })
      }
    });
  },
  
  createMessageReceivedEvent(
    userId: string,
    username: string,
    content: string,
    timestamp: bigint = BigInt(Date.now())
  ): ChatEvent {
    return create(ChatEventSchema, {
      event: {
        case: "messageReceived",
        value: create(MessageReceivedEventSchema, {
          userId,
          username,
          content,
          timestamp
        })
      }
    });
  }
};

// Factory function to create a mock chat client with proper types
export const createMockChatClient = () => {
  // Create mock client that satisfies Connect RPC Client type
  const mockClient = {
    join: vi.fn<[MessageInitShape<JoinRequest>, CallOptions?], AsyncIterable<ChatEvent>>(),
    sendMessage: vi.fn<[MessageInitShape<SendMessageRequest>, CallOptions?], Promise<SendMessageResponse>>(),
    leave: vi.fn<[MessageInitShape<LeaveRequest>, CallOptions?], Promise<LeaveResponse>>(),
  } satisfies Client<typeof ChatService>;
  
  // Set default implementations
  mockClient.join.mockImplementation((request) => {
    const userId = `mock-user-${Date.now()}`;
    const user = create(UserSchema, { id: userId, username: request.username });
    
    return mockHelpers.createMockStream([
      mockHelpers.createConnectionAcceptedEvent(userId, [user]),
    ]);
  });
  
  mockClient.sendMessage.mockResolvedValue(create(SendMessageResponseSchema, { success: true }));
  mockClient.leave.mockResolvedValue(create(LeaveResponseSchema, { success: true }));
  
  // Return mockClient with helpers attached
  return Object.assign(mockClient, {
    ...mockHelpers,
    // Add disconnect method for compatibility with existing tests
    disconnect: vi.fn(),
  });
};

// Type for the mock client with helpers
export type MockChatClient = ReturnType<typeof createMockChatClient>;

// Mock factory for chatClient module
export const mockChatClientModule = () => {
  const mockClient = createMockChatClient();
  
  return {
    chatClient: mockClient,
    ChatClient: vi.fn(() => mockClient)
  };
};