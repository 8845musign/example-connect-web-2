# メッセージへのリアクション機能

## 概要
メッセージに対して絵文字でリアクションを付けられる機能を実装する。SlackやDiscordのような体験を提供する。

## 背景
テキストメッセージだけでは感情表現が限定的。リアクション機能により、より豊かなコミュニケーションが可能になる。

## 技術要件

### Protocol Buffers変更
```proto
// 新しいRPCメソッド
service ChatService {
  // ... 既存のメソッド
  rpc AddReaction(AddReactionRequest) returns (AddReactionResponse);
  rpc RemoveReaction(RemoveReactionRequest) returns (RemoveReactionResponse);
}

message AddReactionRequest {
  string message_id = 1;
  string emoji = 2; // Unicode絵文字 or :shortcode:
}

message AddReactionResponse {
  bool success = 1;
}

message RemoveReactionRequest {
  string message_id = 1;
  string emoji = 2;
}

message RemoveReactionResponse {
  bool success = 1;
}

// ChatEventに追加
message ChatEvent {
  oneof event {
    // ... 既存のイベント
    ReactionAddedEvent reaction_added = 8;
    ReactionRemovedEvent reaction_removed = 9;
  }
}

message ReactionAddedEvent {
  string message_id = 1;
  string user_id = 2;
  string username = 3;
  string emoji = 4;
}

message ReactionRemovedEvent {
  string message_id = 1;
  string user_id = 2;
  string emoji = 3;
}

// MessageReceivedEventの拡張
message MessageReceivedEvent {
  // ... 既存フィールド
  string id = 5; // メッセージIDを追加
  repeated MessageReaction reactions = 6;
}

message MessageReaction {
  string emoji = 1;
  repeated string user_ids = 2;
  int32 count = 3;
}
```

### データベース設計
```sql
-- reactions table
CREATE TABLE reactions (
  message_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  emoji VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id, emoji),
  INDEX idx_message_reactions (message_id)
);
```

### バックエンド実装
1. リアクション管理
   - メッセージIDベースの管理
   - 同一ユーザー・同一絵文字の重複防止
   
2. リアクション集計
   - 絵文字ごとのユーザーリスト管理
   - カウントの効率的な計算

3. イベント配信
   - リアルタイムでのリアクション更新
   - 差分更新の実装

### フロントエンド実装
1. リアクションピッカー
   - よく使う絵文字の表示
   - 絵文字検索機能
   
2. リアクション表示
   - メッセージ下部にリアクションを表示
   - ホバーでユーザーリスト表示

3. インタラクション
   - クリックでリアクション追加/削除
   - アニメーション効果

## 実装アプローチ

### Phase 1: 基本的なリアクション機能
1. Protocol Buffersの更新
2. AddReaction/RemoveReaction RPCの実装
3. メモリベースのリアクション管理

### Phase 2: UI実装
1. リアクションボタンの追加
2. 基本的な絵文字ピッカー
3. リアクション表示コンポーネント

### Phase 3: 永続化とスケーリング
1. データベーステーブルの追加
2. 効率的なクエリ実装
3. キャッシュ戦略

### Phase 4: UX向上
1. 高度な絵文字ピッカー
2. アニメーション効果
3. ショートカットキー対応

## 受け入れ基準
- [ ] メッセージホバー時にリアクションボタンが表示される
- [ ] 絵文字ピッカーから絵文字を選択できる
- [ ] リアクションがリアルタイムで同期される
- [ ] 同じ絵文字を複数ユーザーが選択した場合、カウントが表示される
- [ ] 自分のリアクションは再クリックで削除できる
- [ ] リアクションホバーでユーザーリストが表示される

## 注意事項
- 絵文字の互換性（プラットフォーム間の表示差異）
- パフォーマンス（大量のリアクション時）
- アクセシビリティ（スクリーンリーダー対応）
- カスタム絵文字の将来的な対応

## 関連Issue
- #2 メッセージ履歴（リアクションの永続化）
- #7 チャンネル/ルーム（チャンネル固有のカスタム絵文字）