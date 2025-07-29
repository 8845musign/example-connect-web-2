# 通知システム

## 概要
メッセージ受信、メンション、重要なイベントをユーザーに通知するシステムを実装する。ブラウザ通知、サウンド、視覚的インジケーターを含む。

## 背景
リアルタイムチャットでは、ユーザーが常に画面を見ているとは限らない。適切な通知により、重要なメッセージを見逃さず、効率的なコミュニケーションが可能になる。

## 技術要件

### Protocol Buffers変更
```proto
// 通知設定サービス
service NotificationService {
  rpc GetNotificationSettings(GetNotificationSettingsRequest) returns (GetNotificationSettingsResponse);
  rpc UpdateNotificationSettings(UpdateNotificationSettingsRequest) returns (UpdateNotificationSettingsResponse);
  rpc RegisterPushToken(RegisterPushTokenRequest) returns (RegisterPushTokenResponse);
  rpc MarkNotificationRead(MarkNotificationReadRequest) returns (MarkNotificationReadResponse);
}

message NotificationSettings {
  bool desktop_enabled = 1;
  bool sound_enabled = 2;
  bool email_enabled = 3;
  bool push_enabled = 4;
  
  NotificationLevel global_level = 5;
  map<string, NotificationLevel> channel_levels = 6; // channel_id -> level
  
  repeated string muted_channels = 7;
  repeated string muted_users = 8;
  
  NotificationSchedule schedule = 9;
  string notification_sound = 10;
}

enum NotificationLevel {
  NOTIFICATION_LEVEL_UNSPECIFIED = 0;
  NOTIFICATION_LEVEL_ALL = 1;
  NOTIFICATION_LEVEL_MENTIONS = 2;
  NOTIFICATION_LEVEL_NONE = 3;
}

message NotificationSchedule {
  bool enabled = 1;
  string timezone = 2;
  repeated DaySchedule days = 3;
}

message DaySchedule {
  int32 day_of_week = 1; // 0-6
  string start_time = 2; // "09:00"
  string end_time = 3;   // "18:00"
}

// ChatEventに追加
message ChatEvent {
  oneof event {
    // ... 既存のイベント
    NotificationEvent notification = 10;
  }
}

message NotificationEvent {
  string id = 1;
  NotificationType type = 2;
  string title = 3;
  string body = 4;
  string icon = 5;
  string action_url = 6;
  map<string, string> data = 7;
  int64 timestamp = 8;
}

enum NotificationType {
  NOTIFICATION_TYPE_UNSPECIFIED = 0;
  NOTIFICATION_TYPE_MESSAGE = 1;
  NOTIFICATION_TYPE_MENTION = 2;
  NOTIFICATION_TYPE_DM = 3;
  NOTIFICATION_TYPE_REACTION = 4;
  NOTIFICATION_TYPE_CHANNEL_INVITE = 5;
}
```

### データベース設計
```sql
-- notification_settings table
CREATE TABLE notification_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_notifications (user_id, is_read, created_at DESC)
);

-- push_tokens table
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL, -- 'web', 'ios', 'android'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP,
  UNIQUE(user_id, token)
);
```

### バックエンド実装
1. 通知トリガー
   - メッセージ受信時の通知生成
   - メンション検出（@username）
   - キーワード通知

2. 通知配信
   - WebSocket経由のリアルタイム通知
   - Web Push API統合
   - メール通知（オプション）

3. 通知管理
   - 未読通知数の管理
   - 通知履歴
   - 一括既読機能

### フロントエンド実装
1. ブラウザ通知
   - Notification API権限リクエスト
   - Service Worker統合
   - バックグラウンド通知

2. アプリ内通知
   - 通知センター（ドロップダウン）
   - 未読バッジ
   - トースト通知

3. サウンド通知
   - カスタムサウンド選択
   - ボリューム調整
   - ミュート機能

## 実装アプローチ

### Phase 1: 基本的な通知
1. NotificationServiceの実装
2. メッセージ受信通知
3. ブラウザ通知基本実装

### Phase 2: 通知設定
1. ユーザー設定UI
2. チャンネルごとの設定
3. スケジュール機能

### Phase 3: 高度な通知
1. メンション検出と通知
2. プッシュ通知
3. メール通知統合

### Phase 4: 通知管理
1. 通知センターUI
2. 通知履歴
3. スマート通知（重要度判定）

## 受け入れ基準
- [ ] 新しいメッセージ受信時に通知が表示される
- [ ] @メンションされた時に特別な通知が表示される
- [ ] 通知音が再生される（設定でON/OFF可能）
- [ ] チャンネルごとに通知設定を変更できる
- [ ] 通知スケジュールを設定できる（勤務時間外はOFFなど）
- [ ] 通知センターで過去の通知を確認できる
- [ ] ブラウザを閉じていてもプッシュ通知を受信できる

## 注意事項
- ブラウザ互換性（Notification API）
- 通知の頻度制限（スパム防止）
- プライバシー（通知内容のセキュリティ）
- パフォーマンス（大量通知時）
- モバイル対応

## 関連Issue
- #3 プライベートメッセージ（DM専用通知）
- #4 メッセージリアクション（リアクション通知）
- #7 チャンネル/ルーム（チャンネル別通知設定）