# useChat Hook リファクタリング概要

## 背景
`useChat.ts`フックは117行の単一ファイルで、複数の責務を持っていました：
- WebSocket接続のライフサイクル管理
- チャットイベントの処理（5種類のイベント）
- 状態管理（メッセージ、ユーザー、エラー、接続状態）
- メッセージ送信
- ナビゲーション制御

## リファクタリング内容

### 1. ファイル構成の変更

#### Before
```
src/hooks/
└── useChat.ts (117行)
```

#### After
```
src/
├── types/
│   └── chat.ts                       # 型定義
├── hooks/
│   ├── chat/
│   │   ├── chatReducer.ts           # Reducer とアクション定義
│   │   ├── useChatState.ts          # State管理フック
│   │   ├── useChatConnection.ts     # WebSocket接続管理
│   │   └── handleChatEvent.ts       # イベント処理
│   └── useChat.ts                   # 統合フック (51行)
└── utils/
    └── messageUtils.ts              # メッセージ変換ユーティリティ
```

### 2. 各ファイルの責務

#### `types/chat.ts`
- `DisplayMessage`インターフェースの定義
- `ChatState`インターフェースの定義
- `ChatAction`型の定義（7種類のアクション）

#### `hooks/chat/chatReducer.ts`
- 初期状態の定義
- 状態遷移ロジックの実装（useReducerパターン）
- アクションタイプ: CONNECTED, USER_JOINED, USER_LEFT, MESSAGE_RECEIVED, ERROR, DISCONNECT, RESET

#### `hooks/chat/useChatState.ts`
- `useReducer`のシンプルなラッパー
- state と dispatch を返す

#### `hooks/chat/useChatConnection.ts`
- WebSocket接続のライフサイクル管理
- ストリーミング処理
- `currentUserId`の管理（useRef使用）
- エラーハンドリング

#### `hooks/chat/handleChatEvent.ts`
- チャットイベントからReduxアクションへの変換
- 各イベントタイプの処理ロジック

#### `utils/messageUtils.ts`
- `createDisplayMessage`関数：サーバーメッセージから表示用メッセージへの変換

#### `hooks/useChat.ts`
- 上記のフックを統合
- 既存のAPIインターフェースを維持
- ナビゲーション制御

### 3. 主な改善点

#### コードの簡潔性
- メインのフックが117行から51行に削減
- 各ファイルが50-60行程度の管理しやすいサイズに

#### 責務の分離
- 単一責任の原則に従った設計
- 各モジュールが独立してテスト可能

#### 状態管理の改善
- useReducerパターンによる予測可能な状態遷移
- 状態更新ロジックの一元化

#### 保守性の向上
- ファイル名と関数名の一致（例：`handleChatEvent.ts`）
- 明確なディレクトリ構造

### 4. 技術的な変更点

#### currentUserIdの管理
- Before: `useChat`内で`useRef`を使用
- After: `useChatConnection`内で管理し、`connectionAccepted`イベント時に更新

#### 依存関係の整理
- 循環依存を回避
- 各モジュールの依存関係を最小限に

### 5. テスト結果
- 既存のテストが全て成功（15 passed, 1 skipped）
- APIインターフェースの後方互換性を維持

## まとめ
このリファクタリングにより、コードの可読性、保守性、テスト容易性が大幅に向上しました。各モジュールが明確な責務を持ち、将来の機能追加や変更が容易になりました。