# メッセージ履歴の永続化

## 概要
チャットメッセージをデータベースに保存し、ユーザーが再接続した際に過去のメッセージ履歴を表示できるようにする。

## 背景
現在の実装では、メッセージはメモリ上にのみ保存されており、サーバー再起動やユーザーの再接続時に履歴が失われる。永続化により、継続的なコミュニケーションが可能になる。

## 技術要件

### データベース設計
```sql
-- messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_created_at (created_at DESC)
);

-- users table (将来の拡張用)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP
);
```

### Protocol Buffers変更
```proto
// 新しいRPCメソッド
service ChatService {
  // ... 既存のメソッド
  rpc GetMessageHistory(GetMessageHistoryRequest) returns (GetMessageHistoryResponse);
}

message GetMessageHistoryRequest {
  int32 limit = 1; // デフォルト: 50
  string before_id = 2; // ページネーション用
}

message GetMessageHistoryResponse {
  repeated MessageReceivedEvent messages = 1;
  bool has_more = 2;
}
```

### バックエンド実装
1. データベース接続
   - PostgreSQL or SQLiteの選択
   - 接続プール管理
   - マイグレーション機能

2. メッセージの保存
   - SendMessageでのDB保存
   - トランザクション管理

3. 履歴取得API
   - ページネーション対応
   - 効率的なクエリ

### フロントエンド実装
1. 初回接続時の履歴取得
   - Join成功後にGetMessageHistoryを呼び出し
   - ローディング表示

2. 無限スクロール
   - 上方向スクロールで過去のメッセージを追加取得
   - 仮想スクロールの検討

## 実装アプローチ

### Phase 1: データベース基盤
1. データベースドライバーの追加（prisma or drizzle）
2. スキーマ定義とマイグレーション
3. データベース接続管理

### Phase 2: メッセージ保存
1. SendMessage RPCでのDB保存実装
2. エラーハンドリング
3. トランザクション管理

### Phase 3: 履歴取得機能
1. GetMessageHistory RPCの実装
2. ページネーションロジック
3. キャッシュ戦略

### Phase 4: フロントエンド統合
1. 履歴取得フックの実装
2. メッセージリストコンポーネントの更新
3. 無限スクロール実装

## 受け入れ基準
- [ ] メッセージがデータベースに保存される
- [ ] 再接続時に過去50件のメッセージが自動的に表示される
- [ ] 上方向スクロールで追加の履歴が取得できる
- [ ] 削除されたメッセージは表示されない
- [ ] パフォーマンスが劣化しない（初回ロード3秒以内）
- [ ] データベース接続エラー時も基本的なチャット機能は動作する

## 注意事項
- GDPR/プライバシー規制への対応（メッセージ削除機能）
- データベースのバックアップ戦略
- 大量データに対するインデックス最適化
- メッセージの暗号化を検討

## 関連Issue
- #6 認証システム（ユーザーごとの履歴管理）
- #8 メッセージ検索機能（履歴データの活用）