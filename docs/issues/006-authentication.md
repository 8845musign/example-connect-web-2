# 認証システムの実装

## 概要
ユーザー登録、ログイン、セッション管理を含む完全な認証システムを実装する。

## 背景
現在は簡易的なユーザー名入力のみで、セキュリティや永続的なユーザー管理ができない。適切な認証により、安全で信頼性の高いチャットシステムを構築する。

## 技術要件

### Protocol Buffers変更
```proto
// 新しい認証サービス
service AuthService {
  rpc Register(RegisterRequest) returns (RegisterResponse);
  rpc Login(LoginRequest) returns (LoginResponse);
  rpc Refresh(RefreshRequest) returns (RefreshResponse);
  rpc Logout(LogoutRequest) returns (LogoutResponse);
  rpc GetProfile(GetProfileRequest) returns (GetProfileResponse);
  rpc UpdateProfile(UpdateProfileRequest) returns (UpdateProfileResponse);
}

message RegisterRequest {
  string username = 1;
  string email = 2;
  string password = 3;
}

message RegisterResponse {
  bool success = 1;
  string user_id = 2;
  string access_token = 3;
  string refresh_token = 4;
  string error = 5;
}

message LoginRequest {
  string username_or_email = 1;
  string password = 2;
}

message LoginResponse {
  bool success = 1;
  string user_id = 2;
  string username = 3;
  string access_token = 4;
  string refresh_token = 5;
  string error = 6;
}

message RefreshRequest {
  string refresh_token = 1;
}

message RefreshResponse {
  string access_token = 1;
  string refresh_token = 2;
}

message GetProfileRequest {
  string user_id = 1; // 省略時は自分のプロフィール
}

message GetProfileResponse {
  User user = 1;
  string email = 2; // 自分の場合のみ
  int64 created_at = 3;
}

// Userメッセージの拡張
message User {
  string id = 1;
  string username = 2;
  string avatar_url = 3;
  UserStatus status = 4;
}

enum UserStatus {
  USER_STATUS_UNSPECIFIED = 0;
  USER_STATUS_ONLINE = 1;
  USER_STATUS_AWAY = 2;
  USER_STATUS_OFFLINE = 3;
}
```

### データベース設計
```sql
-- users table (拡張)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'offline',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP,
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
);

-- sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  refresh_token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_sessions (user_id),
  INDEX idx_refresh_token (refresh_token)
);
```

### バックエンド実装
1. 認証ミドルウェア
   - JWT検証
   - リクエストコンテキストへのユーザー情報追加
   - ロール/権限チェック

2. パスワード管理
   - bcryptによるハッシュ化
   - パスワード強度検証
   - パスワードリセット機能

3. セッション管理
   - アクセストークン（15分）
   - リフレッシュトークン（30日）
   - 同時ログイン制限オプション

### フロントエンド実装
1. 認証フロー
   - ログイン/登録フォーム
   - トークン管理（localStorage/Cookie）
   - 自動リフレッシュ

2. 保護されたルート
   - 認証が必要なページの制御
   - リダイレクト処理

3. ユーザー情報表示
   - プロフィール画像
   - オンラインステータス

## 実装アプローチ

### Phase 1: 基本的な認証
1. AuthServiceの実装
2. ユーザー登録/ログイン
3. JWT生成と検証

### Phase 2: セッション管理
1. リフレッシュトークン実装
2. 自動トークン更新
3. ログアウト処理

### Phase 3: プロフィール機能
1. プロフィール取得/更新
2. アバター画像アップロード
3. ステータス管理

### Phase 4: セキュリティ強化
1. メール認証
2. 2要素認証
3. ログイン履歴

## 受け入れ基準
- [ ] ユーザーが新規登録できる
- [ ] 登録済みユーザーがログインできる
- [ ] JWTトークンによる認証が機能する
- [ ] リフレッシュトークンで自動更新される
- [ ] ログアウトが正しく機能する
- [ ] 未認証ユーザーはチャットにアクセスできない
- [ ] プロフィール情報を更新できる

## 注意事項
- パスワードの安全な管理
- トークンの安全な保存
- CSRF対策
- ブルートフォース攻撃対策
- GDPR準拠（データ削除権）

## 関連Issue
- #2 メッセージ履歴（ユーザーごとの履歴管理）
- #3 プライベートメッセージ（認証されたユーザー間のDM）
- #5 ファイルアップロード（ユーザーごとのストレージ管理）