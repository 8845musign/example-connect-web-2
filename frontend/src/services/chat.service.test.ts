import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatClient } from './chat.service';
import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { create } from '@bufbuild/protobuf';
import {
  JoinRequestSchema,
  SendMessageRequestSchema,
  LeaveRequestSchema,
  ChatEventSchema,
  ConnectionAcceptedEventSchema,
  MessageReceivedEventSchema,
  SendMessageResponseSchema,
  LeaveResponseSchema
} from '../gen/proto/chat/v1/chat_pb';
import { createMockChatClient } from '../test/mocks/chat.mock';

// Mock Connect RPC
vi.mock('@connectrpc/connect', () => ({
  createClient: vi.fn()
}));

vi.mock('@connectrpc/connect-web', () => ({
  createConnectTransport: vi.fn()
}));

describe('ChatClient', () => {
  let mockClient: ReturnType<typeof createMockChatClient>;
  let chatClient: ChatClient;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock client using the factory
    mockClient = createMockChatClient();
    
    // Mock createClient to return our mock client
    vi.mocked(createClient).mockReturnValue(mockClient);
    vi.mocked(createConnectTransport).mockReturnValue({});
    
    chatClient = new ChatClient();
  });
  
  describe('join', () => {
    it('should create a join request and yield events', async () => {
      const username = 'testuser';
      const userId = 'test-user-id';
      
      // Mock events to be returned
      const connectionEvent = create(ChatEventSchema, {
        event: {
          case: "connectionAccepted",
          value: create(ConnectionAcceptedEventSchema, {
            userId,
            activeUsers: []
          })
        }
      });
      
      const messageEvent = create(ChatEventSchema, {
        event: {
          case: "messageReceived",
          value: create(MessageReceivedEventSchema, {
            userId: 'other-user',
            username: 'otheruser',
            content: 'Hello!',
            timestamp: BigInt(Date.now())
          })
        }
      });
      
      // Mock the join method to return an async generator
      mockClient.join.mockReturnValue((async function* () {
        yield connectionEvent;
        yield messageEvent;
      })());
      
      const events = [];
      for await (const event of chatClient.join(username)) {
        events.push(event);
      }
      
      // Verify join was called with correct request
      expect(mockClient.join).toHaveBeenCalledWith(
        create(JoinRequestSchema, { username }),
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
      
      // Verify events were yielded
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual(connectionEvent);
      expect(events[1]).toEqual(messageEvent);
      
      // Verify userId was saved
      expect(chatClient['userId']).toBe(userId);
    });
    
    it.skip('should abort previous connection when joining again', async () => {
      const username1 = 'user1';
      const username2 = 'user2';
      
      // First join
      mockClient.join.mockReturnValue((async function* () {
        yield create(ChatEventSchema, {
          event: {
            case: "connectionAccepted",
            value: create(ConnectionAcceptedEventSchema, {
              userId: 'user1-id',
              activeUsers: []
            })
          }
        });
      })());
      
      // Start first join
      const generator1 = chatClient.join(username1);
      await generator1.next();
      
      // Store reference to first abort controller
      const abortController1 = chatClient['abortController'];
      expect(abortController1).toBeTruthy();
      
      // Second join
      mockClient.join.mockReturnValue((async function* () {
        // Simulate delay to allow abort to happen
        await new Promise(resolve => setTimeout(resolve, 0));
        yield create(ChatEventSchema, {
          event: {
            case: "connectionAccepted",
            value: create(ConnectionAcceptedEventSchema, {
              userId: 'user2-id',
              activeUsers: []
            })
          }
        });
      })());
      
      // Join again - this should abort the first connection
      const generator2 = chatClient.join(username2);
      
      // First controller should be aborted immediately
      expect(abortController1?.signal.aborted).toBe(true);
      
      // Clean up
      await generator2.next();
    });
  });
  
  describe('sendMessage', () => {
    it('should send a message with user id header', async () => {
      const content = 'Hello, world!';
      const userId = 'test-user-id';
      
      // Set userId (normally done by join)
      chatClient['userId'] = userId;
      
      // Mock successful response
      mockClient.sendMessage.mockResolvedValue(
        create(SendMessageResponseSchema, { success: true })
      );
      
      await chatClient.sendMessage(content);
      
      // Verify sendMessage was called correctly
      expect(mockClient.sendMessage).toHaveBeenCalledWith(
        create(SendMessageRequestSchema, { content }),
        expect.objectContaining({
          headers: {
            "x-user-id": userId
          }
        })
      );
    });
    
    it('should throw error when not connected', async () => {
      // userId is null when not connected
      chatClient['userId'] = null;
      
      await expect(chatClient.sendMessage('test')).rejects.toThrow('Not connected');
      expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });
    
    it('should throw error when send fails', async () => {
      chatClient['userId'] = 'test-user-id';
      
      // Mock failed response
      mockClient.sendMessage.mockResolvedValue(
        create(SendMessageResponseSchema, { success: false })
      );
      
      await expect(chatClient.sendMessage('test')).rejects.toThrow('Failed to send message');
    });
  });
  
  describe('leave', () => {
    it('should send leave request and disconnect', async () => {
      const userId = 'test-user-id';
      chatClient['userId'] = userId;
      
      // Mock successful response
      mockClient.leave.mockResolvedValue(
        create(LeaveResponseSchema, { success: true })
      );
      
      await chatClient.leave();
      
      // Verify leave was called
      expect(mockClient.leave).toHaveBeenCalledWith(
        create(LeaveRequestSchema, {}),
        expect.objectContaining({
          headers: {
            "x-user-id": userId
          }
        })
      );
      
      // Verify disconnect was called
      expect(chatClient['userId']).toBeNull();
    });
    
    it('should not send leave request when not connected', async () => {
      chatClient['userId'] = null;
      
      await chatClient.leave();
      
      expect(mockClient.leave).not.toHaveBeenCalled();
    });
    
    it('should disconnect even if leave request fails', async () => {
      chatClient['userId'] = 'test-user-id';
      
      // Mock error
      mockClient.leave.mockRejectedValue(new Error('Network error'));
      
      await chatClient.leave();
      
      // Should still disconnect
      expect(chatClient['userId']).toBeNull();
    });
  });
  
  describe('disconnect', () => {
    it('should abort connection and clear user id', () => {
      const abortController = new AbortController();
      chatClient['abortController'] = abortController;
      chatClient['userId'] = 'test-user-id';
      
      chatClient.disconnect();
      
      expect(abortController.signal.aborted).toBe(true);
      expect(chatClient['abortController']).toBeNull();
      expect(chatClient['userId']).toBeNull();
    });
  });
});