import { describe, test, expect } from "vitest";
import { chatReducer, initialChatState } from "./chatReducer";
import type { ChatState, ChatAction, DisplayMessage } from "../../types/chat";
import type { User } from "../../gen/proto/chat/v1/chat_pb";
import { UserSchema } from "../../gen/proto/chat/v1/chat_pb";
import { create } from "@bufbuild/protobuf";

// テストユーティリティ
const createMockUser = (id: string, username: string): User =>
  create(UserSchema, { id, username });

const createMockMessage = (
  id: string,
  userId: string,
  username: string,
  content: string,
  isOwn = false
): DisplayMessage => ({
  id,
  userId,
  username,
  content,
  timestamp: new Date(),
  isOwn,
});

describe("chatReducer", () => {
  describe("initialChatState", () => {
    test("初期状態は未接続で、メッセージとユーザーが空", () => {
      expect(initialChatState).toEqual({
        isConnected: false,
        messages: [],
        users: [],
        error: null,
        currentUserId: null,
      });
    });
  });

  describe("CONNECTED action", () => {
    test("CONNECTED actionで接続状態となり、エラーが初期化され、自分を含めた入室中のユーザーが設定される", () => {
      const userId = "user123";
      const users = [
        createMockUser("user123", "Alice"),
        createMockUser("user456", "Bob"),
      ];

      const action: ChatAction = {
        type: "CONNECTED",
        userId,
        users,
      };

      const prevState: ChatState = {
        ...initialChatState,
        error: "Previous error",
      };

      const newState = chatReducer(prevState, action);

      expect(newState).toEqual({
        isConnected: true,
        messages: [],
        users,
        error: null,
        currentUserId: userId,
      });
    });
  });

  describe("USER_JOINED action", () => {
    test("USER_JOINED actionで新たなユーザーがチャットルームに参加する", () => {
      const existingUser = createMockUser("user123", "Alice");
      const newUser = createMockUser("user456", "Bob");

      const prevState: ChatState = {
        ...initialChatState,
        isConnected: true,
        users: [existingUser],
      };

      const action: ChatAction = {
        type: "USER_JOINED",
        user: newUser,
      };

      const newState = chatReducer(prevState, action);

      expect(newState.users).toHaveLength(2);
      expect(newState.users).toContain(existingUser);
      expect(newState.users).toContain(newUser);
    });
  });

  describe("USER_LEFT action", () => {
    test("USER_LEFT actionで特定のユーザーがチャットルームから退出する", () => {
      const user1 = createMockUser("user123", "Alice");
      const user2 = createMockUser("user456", "Bob");
      const user3 = createMockUser("user789", "Charlie");

      const prevState: ChatState = {
        ...initialChatState,
        isConnected: true,
        users: [user1, user2, user3],
      };

      const action: ChatAction = {
        type: "USER_LEFT",
        userId: "user456",
      };

      const newState = chatReducer(prevState, action);

      expect(newState.users).toHaveLength(2);
      expect(newState.users).toContain(user1);
      expect(newState.users).toContain(user3);
      expect(newState.users).not.toContain(user2);
    });

    test("USER_LEFT actionで存在しないユーザーの退出は無視される", () => {
      const users = [
        createMockUser("user123", "Alice"),
        createMockUser("user456", "Bob"),
      ];

      const prevState: ChatState = {
        ...initialChatState,
        isConnected: true,
        users,
      };

      const action: ChatAction = {
        type: "USER_LEFT",
        userId: "nonexistent",
      };

      const newState = chatReducer(prevState, action);

      expect(newState.users).toHaveLength(2);
      expect(newState.users).toEqual(users);
    });
  });

  describe("MESSAGE_RECEIVED action", () => {
    test("MESSAGE_RECEIVED actionで新しいメッセージがチャット履歴に追加される", () => {
      const existingMessage = createMockMessage(
        "msg1",
        "user123",
        "Alice",
        "Hello"
      );
      const newMessage = createMockMessage(
        "msg2",
        "user456",
        "Bob",
        "Hi there"
      );

      const prevState: ChatState = {
        ...initialChatState,
        isConnected: true,
        messages: [existingMessage],
      };

      const action: ChatAction = {
        type: "MESSAGE_RECEIVED",
        message: newMessage,
      };

      const newState = chatReducer(prevState, action);

      expect(newState.messages).toHaveLength(2);
      expect(newState.messages[0]).toBe(existingMessage);
      expect(newState.messages[1]).toBe(newMessage);
    });
  });

  describe("ERROR action", () => {
    test("ERROR actionでエラーが発生したことが記録される", () => {
      const errorMessage = "Connection failed";

      const action: ChatAction = {
        type: "ERROR",
        error: errorMessage,
      };

      const newState = chatReducer(initialChatState, action);

      expect(newState.error).toBe(errorMessage);
    });

    test("ERROR actionで新しいエラーが既存のエラーを上書きする", () => {
      const prevState: ChatState = {
        ...initialChatState,
        error: "Previous error",
      };

      const action: ChatAction = {
        type: "ERROR",
        error: "New error",
      };

      const newState = chatReducer(prevState, action);

      expect(newState.error).toBe("New error");
    });
  });

  describe("DISCONNECT action", () => {
    test("DISCONNECT actionで接続が切断されるが、チャット履歴とユーザー情報は保持される", () => {
      const prevState: ChatState = {
        ...initialChatState,
        isConnected: true,
        error: "Some error",
        currentUserId: "user123",
        users: [createMockUser("user123", "Alice")],
        messages: [createMockMessage("msg1", "user123", "Alice", "Hello")],
      };

      const action: ChatAction = {
        type: "DISCONNECT",
      };

      const newState = chatReducer(prevState, action);

      expect(newState).toEqual({
        ...prevState,
        isConnected: false,
        error: null,
      });

      // 他のデータは保持される
      expect(newState.currentUserId).toBe("user123");
      expect(newState.users).toHaveLength(1);
      expect(newState.messages).toHaveLength(1);
    });
  });

  describe("RESET action", () => {
    test("RESET actionでチャット状態が完全にリセットされる", () => {
      const prevState: ChatState = {
        isConnected: true,
        messages: [createMockMessage("msg1", "user123", "Alice", "Hello")],
        users: [createMockUser("user123", "Alice")],
        error: "Some error",
        currentUserId: "user123",
      };

      const action: ChatAction = {
        type: "RESET",
      };

      const newState = chatReducer(prevState, action);

      expect(newState).toEqual(initialChatState);
    });
  });

  describe("不明なアクション", () => {
    test("未知のアクションは無視される", () => {
      const prevState: ChatState = {
        ...initialChatState,
        isConnected: true,
        currentUserId: "user123",
      };

      // 意図的に不正なアクションタイプをテスト
      const action = {
        type: "UNKNOWN_ACTION" as const,
      } as ChatAction;

      const newState = chatReducer(prevState, action);

      expect(newState).toBe(prevState);
    });
  });

  describe("状態の不変性", () => {
    test("状態の更新は不変性を保持する", () => {
      const originalState: ChatState = {
        ...initialChatState,
        isConnected: true,
        messages: [],
        users: [],
      };

      const stateCopy = { ...originalState };

      const action: ChatAction = {
        type: "MESSAGE_RECEIVED",
        message: createMockMessage("msg1", "user123", "Alice", "Hello"),
      };

      chatReducer(originalState, action);

      expect(originalState).toEqual(stateCopy);
    });

    test("配列の更新時に新しいインスタンスが作成される", () => {
      const prevState: ChatState = {
        ...initialChatState,
        isConnected: true,
        messages: [createMockMessage("msg1", "user123", "Alice", "Hello")],
        users: [createMockUser("user123", "Alice")],
      };

      const messageAction: ChatAction = {
        type: "MESSAGE_RECEIVED",
        message: createMockMessage("msg2", "user456", "Bob", "Hi"),
      };

      const newStateAfterMessage = chatReducer(prevState, messageAction);
      expect(newStateAfterMessage.messages).not.toBe(prevState.messages);

      const userAction: ChatAction = {
        type: "USER_JOINED",
        user: createMockUser("user789", "Charlie"),
      };

      const newStateAfterUser = chatReducer(prevState, userAction);
      expect(newStateAfterUser.users).not.toBe(prevState.users);
    });
  });
});
