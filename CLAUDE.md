# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time chat application using Connect RPC v2 with server streaming and unary RPCs, built with:
- **Backend**: Node.js, TypeScript, Express, Connect RPC v2 (connect-express)
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

### Connect RPC Pattern (Server Streaming + Unary RPCs)
Due to browser fetch API limitations with client streaming, the app uses:
- **Join** (Server Streaming): Real-time event delivery from server to client
- **SendMessage** (Unary RPC): Send chat messages
- **Leave** (Unary RPC): Disconnect from chat

### Why This Architecture?
The browser's fetch API doesn't support client-side streaming, which prevents bidirectional streaming.
This pattern works around that limitation while maintaining real-time functionality.

### Key Components

**Backend** (`backend/src/`):
- `server.ts`: Express HTTP server with Connect RPC middleware, CORS configuration
- `services/chat.ts`: Chat service implementation with three RPC methods
- `gen/`: Generated Protocol Buffer code (do not edit)

**Frontend** (`frontend/src/`):
- `routes/`: React Router v7 pages (index.tsx = login, chat/room.tsx = chat room)
- `services/chat.service.ts`: Connect RPC client with server streaming support
- `hooks/useChat.ts`: Main hook managing streaming connection and state
- `components/`: UI components (MessageList, UserList, MessageInput)
- `gen/`: Generated Protocol Buffer code (do not edit)

### State Management
- No global state management library (Redux/Zustand)
- Session storage for username persistence
- Local React state in `useChat` hook for messages/users
- User ID stored in client and sent via x-user-id header for authentication

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
- Frontend displays errors via console (toast notifications planned)
- Automatic navigation to login on connection failure

### Session Management
- Each connection gets unique session ID and user ID (UUIDs)
- Username uniqueness enforced at join time
- User ID sent via x-user-id header for SendMessage/Leave authentication
- Proper cleanup on disconnect to prevent memory leaks

### Streaming Pattern
Backend uses server streaming for Join method:
```typescript
async *join(req: JoinRequest, context: HandlerContext) {
  // Setup stream
  const stream = new ReadableStream<ChatEvent>({
    start(controller) { /* setup */ },
    cancel() { /* cleanup */ }
  });
  
  // Yield events
  for await (const event of streamReader) {
    yield event;
  }
}
```

Frontend consumes events with async iteration:
```typescript
const stream = chatClient.join(username);
for await (const event of stream) {
  handleChatEvent(event);
}
```

### CORS Configuration
Express CORS middleware configured to allow:
- Origin: http://localhost:5173
- Custom headers: x-user-id, Connect-Protocol-Version, Connect-Timeout-Ms
- Credentials: true