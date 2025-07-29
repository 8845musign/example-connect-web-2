# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time chat application using Connect RPC v2's bidirectional streaming, built with:
- **Backend**: Node.js, TypeScript, Connect RPC v2
- **Frontend**: React 18, React Router v7 (Framework Mode), TypeScript, Vite
- **Protocol**: Protocol Buffers v3, Buf for code generation

## Development Commands

### Essential Commands
```bash
# Install all dependencies (root, backend, frontend)
npm run install:all

# Generate TypeScript code from .proto files (uses Buf)
npm run generate

# Start development servers (backend on :8080, frontend on :5173)
npm run dev

# Backend-specific commands (from backend/ directory)
npm run lint      # ESLint for TypeScript files
npm run format    # Prettier formatting
npm run build     # TypeScript compilation

# Frontend-specific commands (from frontend/ directory)  
npm run lint      # ESLint
npm run build     # TypeScript + Vite build
```

### Note on Scripts
All scripts are defined in package.json. Shell scripts have been removed in favor of cross-platform npm scripts.

### Testing
Currently no test framework is configured. When implementing tests, check package.json for test scripts.

## Architecture

### Connect RPC Bidirectional Streaming
The app uses a single bidirectional streaming RPC endpoint `ChatService.Chat()` for all real-time communication:
- Client sends: `ChatMessage` (join/sendMessage/leave)
- Server sends: `ChatEvent` (connectionAccepted/userJoined/userLeft/messageReceived/error)

### Key Components

**Backend** (`backend/src/`):
- `server.ts`: HTTP server with Connect RPC adapter, CORS configuration
- `services/chat.ts`: Chat service implementation with session management, broadcasting logic
- `gen/`: Generated Protocol Buffer code (do not edit)

**Frontend** (`frontend/src/`):
- `routes/`: React Router v7 pages (index.tsx = login, chat/room.tsx = chat room)
- `services/chat.service.ts`: Connect RPC client singleton
- `hooks/useChat.ts`: Main hook managing WebSocket connection and state
- `components/`: UI components (MessageList, UserList, MessageInput)
- `gen/`: Generated Protocol Buffer code (do not edit)

### State Management
- No global state management library (Redux/Zustand)
- Session storage for username persistence
- Local React state in `useChat` hook for messages/users

### Protocol Buffer Modifications
When modifying `proto/chat/v1/chat.proto`:
1. Update the .proto file
2. Run `npm run generate` to regenerate TypeScript code
3. Update both backend service implementation and frontend client code

## File Management
- ファイルの削除に失敗した場合、ユーザーに削除を代行してもらうこと

## Important Patterns

### Error Handling
- Connect RPC errors use `ConnectError` with proper error codes
- Frontend displays errors via toast notifications
- Automatic navigation to login on connection failure

### Session Management
- Each connection gets unique session ID and user ID (UUIDs)
- Username uniqueness enforced at join time
- Proper cleanup on disconnect to prevent memory leaks

### Streaming Pattern
Backend uses `ReadableStream` for event distribution:
```typescript
const responseStream = new ReadableStream<ChatEvent>({
  start(controller) { /* setup */ },
  cancel() { /* cleanup */ }
});
```

Frontend consumes events with async iteration:
```typescript
for await (const event of stream) {
  handleChatEvent(event);
}
```