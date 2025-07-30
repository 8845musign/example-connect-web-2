import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from '@bufbuild/protobuf';
import { UserSchema, SendMessageResponseSchema, LeaveResponseSchema } from '../gen/proto/chat/v1/chat_pb';
import { createMockChatClient, type MockChatClient } from '../test/mocks/chat.mock';

// Mock React Router first
const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate
}));

// Mock the chat service module
vi.mock('../services/chat.service', async () => {
  const { createMockChatClient } = await import('../test/mocks/chat.mock');
  return {
    chatClient: createMockChatClient()
  };
});

// Now we can import useChat after the mocks are set up
import { useChat } from './useChat';

describe('useChat', () => {
  let mockChatClient: MockChatClient;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    // Get the mocked chat client
    const { chatClient } = await import('../services/chat.service');
    mockChatClient = chatClient as MockChatClient;
    
    // Reset default implementations
    mockChatClient.join.mockImplementation((request) => {
      const userId = `mock-user-${Date.now()}`;
      const user = create(UserSchema, { id: userId, username: request.username });
      
      return mockChatClient.createMockStream([
        mockChatClient.createConnectionAcceptedEvent(userId, [user]),
      ]);
    });
    
    mockChatClient.sendMessage.mockResolvedValue(create(SendMessageResponseSchema, { success: true }));
    mockChatClient.leave.mockResolvedValue(create(LeaveResponseSchema, { success: true }));
  });
  
  it('should redirect to login when username is empty', () => {
    renderHook(() => useChat(''));
    
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
  
  it('should connect and handle connection accepted event', async () => {
    const username = 'testuser';
    const userId = 'test-user-id';
    const activeUsers = [
      create(UserSchema, { id: userId, username })
    ];
    
    // Set up mock stream with connection accepted event
    mockChatClient.join.mockReturnValue(
      mockChatClient.createMockStream([
        mockChatClient.createConnectionAcceptedEvent(userId, activeUsers)
      ])
    );
    
    const { result } = renderHook(() => useChat(username));
    
    // Initially not connected
    expect(result.current.isConnected).toBe(false);
    
    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    // Check that users are set
    expect(result.current.users).toHaveLength(1);
    expect(result.current.users[0].username).toBe(username);
  });
  
  it('should handle incoming messages', async () => {
    const username = 'testuser';
    const userId = 'test-user-id';
    
    // Set up mock stream with connection and message events
    mockChatClient.join.mockReturnValue(
      mockChatClient.createMockStream([
        mockChatClient.createConnectionAcceptedEvent(userId, []),
        mockChatClient.createMessageReceivedEvent(
          'other-user-id',
          'otheruser',
          'Hello, world!'
        )
      ])
    );
    
    const { result } = renderHook(() => useChat(username));
    
    // Wait for message to be received
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });
    
    const message = result.current.messages[0];
    expect(message.content).toBe('Hello, world!');
    expect(message.username).toBe('otheruser');
    expect(message.isOwn).toBe(false);
  });
  
  it('should send messages', async () => {
    const username = 'testuser';
    const userId = 'test-user-id';
    
    mockChatClient.join.mockReturnValue(
      mockChatClient.createMockStream([
        mockChatClient.createConnectionAcceptedEvent(userId, [])
      ])
    );
    
    const { result } = renderHook(() => useChat(username));
    
    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
    
    // Send a message
    await act(async () => {
      await result.current.sendMessage('Test message');
    });
    
    expect(mockChatClient.sendMessage).toHaveBeenCalledWith('Test message');
  });
  
  it('should handle user join events', async () => {
    const username = 'testuser';
    const userId = 'test-user-id';
    const newUser = create(UserSchema, { id: 'new-user-id', username: 'newuser' });
    
    mockChatClient.join.mockReturnValue(
      mockChatClient.createMockStream([
        mockChatClient.createConnectionAcceptedEvent(userId, []),
        mockChatClient.createUserJoinedEvent(newUser)
      ])
    );
    
    const { result } = renderHook(() => useChat(username));
    
    // Wait for user to be added
    await waitFor(() => {
      expect(result.current.users).toHaveLength(1);
    });
    
    expect(result.current.users[0].username).toBe('newuser');
  });
  
  it('should cleanup on unmount', async () => {
    const username = 'testuser';
    
    mockChatClient.join.mockReturnValue(
      mockChatClient.createMockStream([])
    );
    
    const { unmount } = renderHook(() => useChat(username));
    
    unmount();
    
    expect(mockChatClient.leave).toHaveBeenCalled();
  });
  
  it('should handle connection errors', async () => {
    const username = 'testuser';
    const errorMessage = 'Connection failed';
    
    // Mock join to throw an error
    mockChatClient.join.mockImplementation(() => {
      throw new Error(errorMessage);
    });
    
    const { result } = renderHook(() => useChat(username));
    
    // Wait for error handling
    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
    });
    
    // Should redirect to login on error
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});