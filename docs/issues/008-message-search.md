# メッセージ検索機能

## 概要
過去のチャットメッセージを検索できる機能を実装する。キーワード検索、フィルタリング、高度な検索オプションを提供する。

## 背景
チャット履歴が増えるにつれ、特定の情報を見つけることが困難になる。効率的な検索機能により、過去の会話や共有された情報に素早くアクセスできるようになる。

## 技術要件

### Protocol Buffers変更
```proto
// 新しい検索サービス
service SearchService {
  rpc SearchMessages(SearchMessagesRequest) returns (SearchMessagesResponse);
  rpc SearchFiles(SearchFilesRequest) returns (SearchFilesResponse);
  rpc GetSearchSuggestions(GetSearchSuggestionsRequest) returns (GetSearchSuggestionsResponse);
}

message SearchMessagesRequest {
  string query = 1;
  SearchFilters filters = 2;
  int32 limit = 3; // デフォルト: 20
  string cursor = 4; // ページネーション用
  SearchSortOrder sort_order = 5;
}

message SearchFilters {
  repeated string channel_ids = 1;
  repeated string user_ids = 2;
  int64 date_from = 3;
  int64 date_to = 4;
  repeated string file_types = 5;
  bool has_attachments = 6;
  bool has_reactions = 7;
  repeated string reaction_emojis = 8;
}

enum SearchSortOrder {
  SEARCH_SORT_ORDER_UNSPECIFIED = 0;
  SEARCH_SORT_ORDER_RELEVANCE = 1;
  SEARCH_SORT_ORDER_DATE_DESC = 2;
  SEARCH_SORT_ORDER_DATE_ASC = 3;
}

message SearchMessagesResponse {
  repeated SearchResult results = 1;
  int32 total_count = 2;
  string next_cursor = 3;
  repeated SearchFacet facets = 4;
  int64 search_time_ms = 5;
}

message SearchResult {
  MessageReceivedEvent message = 1;
  string channel_name = 2;
  repeated HighlightRange highlights = 3;
  float relevance_score = 4;
  SearchContext context = 5;
}

message HighlightRange {
  int32 start = 1;
  int32 end = 2;
}

message SearchContext {
  MessageReceivedEvent previous_message = 1;
  MessageReceivedEvent next_message = 2;
}

message SearchFacet {
  string field = 1;
  repeated FacetValue values = 2;
}

message FacetValue {
  string value = 1;
  int32 count = 2;
}
```

### 検索エンジン設計
1. 全文検索エンジン
   - PostgreSQL Full Text Search
   - またはElasticsearch統合
   - 日本語対応（形態素解析）

2. インデックス設計
```sql
-- PostgreSQL FTS
ALTER TABLE messages ADD COLUMN search_vector tsvector;

CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);

-- トリガーで自動更新
CREATE TRIGGER messages_search_vector_update
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', content);

-- 検索用ビュー
CREATE VIEW searchable_messages AS
SELECT 
  m.*,
  c.name as channel_name,
  u.username,
  ts_rank(m.search_vector, plainto_tsquery($1)) as rank
FROM messages m
JOIN channels c ON m.channel_id = c.id
JOIN users u ON m.user_id = u.id
WHERE m.deleted_at IS NULL;
```

### バックエンド実装
1. 検索クエリ処理
   - クエリパーサー
   - 検索演算子対応（AND, OR, NOT, ""）
   - ファジー検索

2. フィルタリング
   - 複数条件の組み合わせ
   - 日付範囲検索
   - ファセット集計

3. パフォーマンス最適化
   - 検索結果キャッシュ
   - インデックス最適化
   - 非同期インデックス更新

### フロントエンド実装
1. 検索UI
   - グローバル検索バー
   - 高度な検索モーダル
   - 検索履歴

2. 検索結果表示
   - ハイライト表示
   - コンテキスト表示
   - 結果内ナビゲーション

3. フィルターUI
   - ファセットフィルター
   - 日付ピッカー
   - 保存された検索

## 実装アプローチ

### Phase 1: 基本的なテキスト検索
1. SearchServiceの実装
2. 単純なキーワード検索
3. 基本的な検索UI

### Phase 2: フィルタリング機能
1. 詳細フィルター実装
2. ファセット集計
3. 高度な検索UI

### Phase 3: 検索最適化
1. インデックス最適化
2. 検索候補提案
3. 検索履歴機能

### Phase 4: 高度な機能
1. ファイル内容検索
2. 正規表現検索
3. 検索結果のエクスポート

## 受け入れ基準
- [ ] キーワードでメッセージを検索できる
- [ ] 検索結果がハイライト表示される
- [ ] チャンネル、ユーザー、日付でフィルタリングできる
- [ ] 検索結果にコンテキスト（前後のメッセージ）が表示される
- [ ] 検索が高速に実行される（1秒以内）
- [ ] 日本語検索が適切に機能する
- [ ] 検索履歴が保存される

## 注意事項
- 大量データでのパフォーマンス
- プライバシー（検索権限の制御）
- 検索インデックスのサイズ管理
- リアルタイムインデックス更新
- 多言語対応

## 関連Issue
- #2 メッセージ履歴（検索対象データ）
- #5 ファイルアップロード（ファイル検索）
- #7 チャンネル/ルーム（チャンネル内検索）