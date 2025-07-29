# プライベートメッセージ（DM）機能

## 概要
特定のユーザーと1対1でプライベートなメッセージをやり取りできる機能を実装する。

## 背景
現在はパブリックチャットのみで、個人的な会話をする手段がない。DMにより、よりパーソナルなコミュニケーションが可能になる。

## 技術要件

### Protocol Buffers変更
```proto
// 新しいRPCメソッド
service ChatService {
  // ... 既存のメソッド
  rpc SendPrivateMessage(SendPrivateMessageRequest) returns (SendPrivateMessageResponse);
  rpc GetPrivateConversations(GetPrivateConversationsRequest) returns (GetPrivateConversationsResponse);
}

message SendPrivateMessageRequest {
  string recipient_user_id = 1;
  string content = 2;
}

message SendPrivateMessageResponse {
  bool success = 1;
  string message_id = 2;
}

message GetPrivateConversationsRequest {
  int32 limit = 1; // デフォルト: 20
}

message GetPrivateConversationsResponse {
  repeated PrivateConversation conversations = 1;
}

message PrivateConversation {
  string user_id = 1;
  string username = 2;
  MessageReceivedEvent last_message = 3;
  int32 unread_count = 4;
}

// ChatEventに追加
message ChatEvent {
  oneof event {
    // ... 既存のイベント
    PrivateMessageReceivedEvent private_message_received = 7;
  }
}

message PrivateMessageReceivedEvent {
  string sender_id = 1;
  string sender_username = 2;
  string content = 3;
  int64 timestamp = 4;
  string message_id = 5;
}
```

### データベース設計（履歴永続化と連携）
```sql
-- private_messages table
CREATE TABLE private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id VARCHAR(255) NOT NULL,
  recipient_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversation (sender_id, recipient_id, created_at DESC),
  INDEX idx_recipient_unread (recipient_id, is_read, created_at DESC)
);
```

### バックエンド実装
1. プライベートメッセージの送信
   - 受信者のオンライン状態確認
   - リアルタイム配信とDB保存
   
2. 会話リストの管理
   - 最新メッセージと未読数の集計
   - 効率的なクエリ

3. 既読管理
   - メッセージ表示時の既読フラグ更新
   - 既読通知の送信

### フロントエンド実装
1. DM開始UI
   - ユーザーリストからDM開始ボタン
   - 会話リストサイドバー

2. DM専用チャットビュー
   - パブリック/プライベートの切り替え
   - 未読バッジ表示

3. 通知強化
   - DMの特別な通知音
   - デスクトップ通知

## 実装アプローチ

### Phase 1: 基本的なDM送受信
1. Protocol Buffersの更新
2. SendPrivateMessage RPCの実装
3. プライベートメッセージイベントの配信

### Phase 2: UI実装
1. DM開始ボタンの追加
2. 会話切り替えUI
3. プライベートメッセージ表示

### Phase 3: 会話管理
1. 会話リストAPI
2. 未読数管理
3. 既読機能

### Phase 4: 通知と最適化
1. 通知システム統合
2. リアルタイム更新
3. パフォーマンス最適化

## 受け入れ基準
- [ ] ユーザーリストから特定ユーザーとのDMを開始できる
- [ ] DMはパブリックチャットと分離して表示される
- [ ] オフラインユーザーへのメッセージも保存され、次回ログイン時に配信される
- [ ] 未読メッセージ数が表示される
- [ ] 既読状態が管理される
- [ ] DM受信時に特別な通知が表示される

## 注意事項
- プライバシー設定（DM受信の許可/拒否）
- ブロック機能の将来的な実装
- スパムメッセージ対策
- エンドツーエンド暗号化の検討

## 関連Issue
- #1 タイピングインジケーター（DM専用の表示制御）
- #2 メッセージ履歴（プライベートメッセージの永続化）
- #9 通知システム（DM専用の通知）