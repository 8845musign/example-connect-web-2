# チャンネル/ルーム機能

## 概要
複数のチャットルーム（チャンネル）を作成・管理し、トピックごとに会話を分離できる機能を実装する。

## 背景
現在は単一のグローバルチャットのみ。複数のトピックや部門ごとのコミュニケーションを可能にすることで、より構造化されたコミュニケーションが実現できる。

## 技術要件

### Protocol Buffers変更
```proto
// 新しいチャンネルサービス
service ChannelService {
  rpc CreateChannel(CreateChannelRequest) returns (CreateChannelResponse);
  rpc ListChannels(ListChannelsRequest) returns (ListChannelsResponse);
  rpc JoinChannel(JoinChannelRequest) returns (stream ChannelEvent);
  rpc LeaveChannel(LeaveChannelRequest) returns (LeaveChannelResponse);
  rpc UpdateChannel(UpdateChannelRequest) returns (UpdateChannelResponse);
  rpc DeleteChannel(DeleteChannelRequest) returns (DeleteChannelResponse);
  rpc GetChannelMembers(GetChannelMembersRequest) returns (GetChannelMembersResponse);
}

message Channel {
  string id = 1;
  string name = 2;
  string description = 3;
  ChannelType type = 4;
  string creator_id = 5;
  int64 created_at = 6;
  int32 member_count = 7;
  bool is_member = 8;
  ChannelSettings settings = 9;
}

enum ChannelType {
  CHANNEL_TYPE_UNSPECIFIED = 0;
  CHANNEL_TYPE_PUBLIC = 1;
  CHANNEL_TYPE_PRIVATE = 2;
  CHANNEL_TYPE_DIRECT = 3; // DM用
}

message ChannelSettings {
  bool is_read_only = 1;
  bool is_announcement = 2;
  repeated string allowed_file_types = 3;
  int32 message_retention_days = 4;
}

message CreateChannelRequest {
  string name = 1;
  string description = 2;
  ChannelType type = 3;
  ChannelSettings settings = 4;
}

message JoinChannelRequest {
  string channel_id = 1;
}

message ChannelEvent {
  oneof event {
    ChannelConnectionAccepted connection_accepted = 1;
    ChannelMessageReceived message_received = 2;
    ChannelMemberJoined member_joined = 3;
    ChannelMemberLeft member_left = 4;
    ChannelUpdated channel_updated = 5;
    // ... 他のチャンネル固有イベント
  }
}

// SendMessageRequestの拡張
message SendMessageRequest {
  string content = 1;
  string channel_id = 2; // 追加
  string reply_to_id = 3; // スレッド機能用
}
```

### データベース設計
```sql
-- channels table
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  creator_id UUID NOT NULL REFERENCES users(id),
  is_archived BOOLEAN DEFAULT FALSE,
  settings JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name)
);

-- channel_members table
CREATE TABLE channel_members (
  channel_id UUID NOT NULL REFERENCES channels(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP,
  notification_level VARCHAR(50) DEFAULT 'all',
  PRIMARY KEY (channel_id, user_id),
  INDEX idx_user_channels (user_id)
);

-- messagesテーブルの拡張
ALTER TABLE messages ADD COLUMN channel_id UUID REFERENCES channels(id);
ALTER TABLE messages ADD COLUMN reply_to_id UUID REFERENCES messages(id);
CREATE INDEX idx_channel_messages ON messages(channel_id, created_at DESC);
```

### バックエンド実装
1. チャンネル管理
   - CRUD操作
   - メンバーシップ管理
   - 権限チェック（作成者、管理者、メンバー）

2. マルチチャンネル対応
   - チャンネルごとのWebSocketルーム
   - 効率的なメッセージルーティング

3. チャンネル固有機能
   - プライベートチャンネルの招待制
   - チャンネル設定の管理
   - アーカイブ機能

### フロントエンド実装
1. チャンネルサイドバー
   - チャンネル一覧表示
   - 未読インジケーター
   - チャンネル検索

2. チャンネル作成/編集UI
   - 作成ダイアログ
   - 設定画面
   - メンバー管理

3. マルチチャンネル対応
   - チャンネル切り替え
   - 各チャンネルのメッセージ履歴管理
   - 通知設定

## 実装アプローチ

### Phase 1: 基本的なチャンネル機能
1. ChannelServiceの基本実装
2. パブリックチャンネルのCRUD
3. チャンネル切り替えUI

### Phase 2: メッセージのチャンネル対応
1. メッセージとチャンネルの紐付け
2. チャンネルごとのストリーミング
3. 履歴の分離

### Phase 3: 高度なチャンネル機能
1. プライベートチャンネル
2. チャンネル招待機能
3. 権限管理

### Phase 4: UX向上
1. 未読管理
2. チャンネル通知設定
3. チャンネル内検索

## 受け入れ基準
- [ ] チャンネルを作成できる
- [ ] チャンネル一覧が表示される
- [ ] チャンネルに参加/退出できる
- [ ] チャンネルごとにメッセージが分離される
- [ ] プライベートチャンネルは招待されたユーザーのみ参加可能
- [ ] チャンネル設定を変更できる（作成者/管理者のみ）
- [ ] チャンネルをアーカイブできる

## 注意事項
- 大量チャンネルのスケーラビリティ
- チャンネル間のメッセージ移動の制限
- デフォルトチャンネルの設定
- チャンネル削除時のメッセージ処理

## 関連Issue
- #2 メッセージ履歴（チャンネルごとの履歴管理）
- #3 プライベートメッセージ（DMもチャンネルとして実装）
- #8 メッセージ検索（チャンネル内検索）
- #9 通知システム（チャンネルごとの通知設定）