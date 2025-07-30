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
npm run dev       # Start development server with nodemon + tsx
npm run build     # TypeScript compilation
npm run start     # Production server (requires build)
npm run lint      # ESLint for TypeScript files
npm run format    # Prettier formatting

# Frontend-specific commands (from frontend/ directory)  
npm run dev       # Start Vite dev server
npm run build     # TypeScript + Vite production build
npm run preview   # Preview production build
npm run lint      # ESLint
npm run lint:fix  # ESLint with auto-fix
```

### Note on Scripts
All scripts are defined in package.json. Shell scripts have been removed in favor of cross-platform npm scripts.

### Testing

**Frontend Testing with Vitest**:
- Framework: Vitest with React Testing Library
- Test files: Located in same directory as source (e.g., `useChat.test.ts` next to `useChat.ts`)
- In-source testing: Enabled for utilities (see `src/utils/validation.ts`)
- Mock utilities: Available in `src/test/mocks/` for Connect RPC streaming
- Run tests: `npm run test` (watch mode) or `npm run test:run` (single run)

```bash
# Frontend testing commands (from frontend/ directory)
npm run test          # Watch mode
npm run test:ui       # UI mode
npm run test:run      # Single run
npm run test:coverage # Coverage report
```

**Backend Testing**: Not yet configured

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

## Code Quality Standards

### ESLint Configuration
- **Backend**: TypeScript strict rules with type checking enabled
  - No unused variables (except underscore-prefixed)
  - No explicit any
  - Ignores generated code in `src/gen`
- **Frontend**: Modern ESLint flat config with TypeScript + React rules
  - React hooks linting
  - React refresh linting for Vite HMR
  - Ignores `dist`, `.react-router`, and `src/gen`

### Important Dependencies
- **Connect RPC v2**: `@connectrpc/connect` (v2.0.0+)
- **Protocol Buffers**: `@bufbuild/protobuf` (v2.2.0+)
- **Buf CLI**: `@bufbuild/buf` for code generation
- **TypeScript**: v5.3+ (backend), v5.8+ (frontend)

## Directory Structure Details

```
connect-web-2/
├── buf.gen.yaml        # Buf code generation config
│                       # Generates to both backend/src/gen and frontend/src/gen
├── proto/
│   └── chat/v1/
│       └── chat.proto  # Service definitions - modify here first
├── backend/
│   ├── src/
│   │   ├── server.ts   # Express server setup with CORS + logging
│   │   ├── services/
│   │   │   └── chat.ts # ChatManager class + service implementation
│   │   └── gen/        # Generated code (DO NOT EDIT)
│   └── tsconfig.json   # ES2022, module: NodeNext
└── frontend/
    ├── src/
    │   ├── routes/     # React Router v7 file-based routing
    │   │   ├── _index.tsx    # Login page
    │   │   └── chat/
    │   │       └── room.tsx  # Chat room page
    │   ├── services/
    │   │   └── chat.service.ts  # ChatClient class with streaming
    │   ├── hooks/
    │   │   └── useChat.ts       # Main state management hook
    │   └── gen/                 # Generated code (DO NOT EDIT)
    └── vite.config.ts           # Vite + React Router plugin
```

## Common Development Tasks

### Adding a New RPC Method
1. Update `proto/chat/v1/chat.proto`
2. Run `npm run generate`
3. Implement in `backend/src/services/chat.ts`
4. Update `frontend/src/services/chat.service.ts`
5. Update `frontend/src/hooks/useChat.ts` if needed

### Debugging Connection Issues
- Check browser console for detailed logs
- Backend logs all requests with timestamps
- Verify CORS headers match in `backend/src/server.ts`
- Check x-user-id header is sent for authenticated RPCs

### Type Generation Notes
- Import extensions use `.js` even for TypeScript files
- Generated imports follow ES module conventions
- Both backend and frontend share same proto definitions

## Testing Guidelines

### Frontend Testing Setup
The frontend uses Vitest with the following configuration:
- **Test Location**: Tests are co-located with source files (e.g., `component.test.ts`)
- **In-Source Testing**: Enabled via `import.meta.vitest` for utility functions
- **Mocking**: Custom mock utilities for Connect RPC streaming in `src/test/mocks/`
- **Test Utils**: Router testing utilities in `src/test/utils/`

### Writing Tests for Connect RPC
```typescript
// Example: Testing a hook that uses Connect RPC streaming
import { MockChatClient } from '../test/mocks/chat.mock';
const mockClient = new MockChatClient();

// Mock streaming responses
mockClient.join.mockReturnValue(
  mockClient.createMockStream([
    mockClient.createConnectionAcceptedEvent(userId, users),
    mockClient.createMessageReceivedEvent(userId, username, content)
  ])
);
```

### In-Source Testing Example
```typescript
// src/utils/someUtil.ts
export const myFunction = (input: string) => { /* ... */ };

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  test('myFunction works correctly', () => {
    expect(myFunction('test')).toBe('expected');
  });
}
```