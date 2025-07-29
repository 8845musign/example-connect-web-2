# ファイル/画像アップロード機能

## 概要
チャットで画像やファイルを共有できる機能を実装する。ドラッグ＆ドロップにも対応する。

## 背景
テキストのみのコミュニケーションには限界がある。画像やドキュメントの共有により、より効果的な情報伝達が可能になる。

## 技術要件

### Protocol Buffers変更
```proto
// 新しいRPCメソッド
service ChatService {
  // ... 既存のメソッド
  rpc UploadFile(stream UploadFileRequest) returns (UploadFileResponse);
  rpc GetFileUrl(GetFileUrlRequest) returns (GetFileUrlResponse);
}

message UploadFileRequest {
  oneof data {
    FileMetadata metadata = 1;
    bytes chunk = 2;
  }
}

message FileMetadata {
  string filename = 1;
  string content_type = 2;
  int64 size = 3;
}

message UploadFileResponse {
  string file_id = 1;
  string url = 2;
  string thumbnail_url = 3; // 画像の場合
}

message GetFileUrlRequest {
  string file_id = 1;
}

message GetFileUrlResponse {
  string url = 1;
  int64 expires_at = 2; // 署名付きURLの有効期限
}

// MessageReceivedEventの拡張
message MessageReceivedEvent {
  // ... 既存フィールド
  repeated FileAttachment attachments = 7;
}

message FileAttachment {
  string file_id = 1;
  string filename = 2;
  string content_type = 3;
  int64 size = 4;
  string url = 5;
  string thumbnail_url = 6; // 画像の場合
  ImageDimensions dimensions = 7; // 画像の場合
}

message ImageDimensions {
  int32 width = 1;
  int32 height = 2;
}
```

### ストレージ設計
1. ローカルストレージ
   - ファイルシステムベース
   - 一時的な開発環境用

2. クラウドストレージ（本番環境）
   - S3 or Google Cloud Storage
   - 署名付きURL for セキュアアクセス
   - CDN統合

### データベース設計
```sql
-- files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(255) NOT NULL,
  size BIGINT NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  thumbnail_path VARCHAR(500),
  width INT,
  height INT,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_user_files (user_id, uploaded_at DESC)
);
```

### バックエンド実装
1. ファイルアップロード処理
   - ストリーミングアップロード
   - ファイルタイプ検証
   - サイズ制限（例：50MB）
   
2. 画像処理
   - サムネイル生成（sharp使用）
   - EXIF情報の削除
   - 画像最適化

3. セキュリティ
   - ウイルススキャン（ClamAV）
   - コンテンツタイプ検証
   - アクセス制御

### フロントエンド実装
1. ファイル選択UI
   - ファイル選択ボタン
   - ドラッグ＆ドロップエリア
   - プレビュー表示

2. アップロード進行状況
   - プログレスバー
   - キャンセル機能
   - エラーハンドリング

3. ファイル表示
   - インライン画像表示
   - ファイルダウンロードリンク
   - ライトボックス表示

## 実装アプローチ

### Phase 1: 基本的なファイルアップロード
1. Protocol Buffersの更新
2. ファイルアップロードRPCの実装
3. ローカルストレージへの保存

### Phase 2: UI実装
1. ファイル選択ボタン
2. アップロード進行状況表示
3. 基本的なファイル表示

### Phase 3: 画像最適化
1. サムネイル生成
2. 画像プレビュー
3. ライトボックス実装

### Phase 4: 高度な機能
1. ドラッグ＆ドロップ
2. ペースト対応
3. 複数ファイル同時アップロード

## 受け入れ基準
- [ ] ファイル選択ダイアログからファイルをアップロードできる
- [ ] ドラッグ＆ドロップでファイルをアップロードできる
- [ ] アップロード進行状況が表示される
- [ ] 画像はインラインで表示される
- [ ] 画像以外のファイルはダウンロードリンクとして表示される
- [ ] ファイルサイズ制限が適用される（50MB）
- [ ] 許可されたファイルタイプのみアップロード可能

## 注意事項
- ストレージコストの管理
- 大容量ファイルのハンドリング
- モバイルでのパフォーマンス
- アクセシビリティ（代替テキスト）
- GDPR対応（ファイル削除機能）

## 関連Issue
- #2 メッセージ履歴（ファイルメタデータの永続化）
- #10 レート制限（アップロード制限）