# レート制限とスパム対策

## 概要
APIエンドポイントとメッセージ送信に対するレート制限を実装し、スパムや悪用からシステムを保護する。

## 背景
オープンなチャットシステムは、スパムボットや悪意のあるユーザーによる攻撃の対象となりやすい。適切なレート制限により、サービスの安定性とユーザー体験を保護する。

## 技術要件

### レート制限戦略
```typescript
// レート制限の種類
interface RateLimitRules {
  // API全体
  globalApiLimit: {
    requests: 1000,
    window: '1h',
    burst: 50
  },
  
  // エンドポイント別
  endpoints: {
    sendMessage: { requests: 30, window: '1m' },
    uploadFile: { requests: 10, window: '10m' },
    createChannel: { requests: 5, window: '1h' },
    register: { requests: 3, window: '1h' },
    login: { requests: 5, window: '15m' }
  },
  
  // コンテンツベース
  content: {
    duplicateMessages: { threshold: 3, window: '5m' },
    messageLength: { max: 2000 },
    mentionsPerMessage: { max: 10 },
    linksPerMessage: { max: 5 }
  }
}
```

### ミドルウェア実装
```typescript
// Express用レート制限ミドルウェア
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl',
  points: 30, // リクエスト数
  duration: 60, // 秒
  blockDuration: 600, // ブロック時間（秒）
});

// Connect RPC用インターセプター
const rateLimitInterceptor: Interceptor = (next) => async (req) => {
  const userId = req.header.get('x-user-id');
  const endpoint = req.method.name;
  
  try {
    await rateLimiter.consume(userId, 1);
    return await next(req);
  } catch (e) {
    throw new ConnectError(
      'Rate limit exceeded',
      Code.ResourceExhausted,
      { retryAfter: e.msBeforeNext }
    );
  }
};
```

### データベース設計
```sql
-- rate_limit_violations table
CREATE TABLE rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  ip_address INET,
  endpoint VARCHAR(255),
  violation_type VARCHAR(50),
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_violations (user_id, created_at DESC),
  INDEX idx_ip_violations (ip_address, created_at DESC)
);

-- spam_patterns table
CREATE TABLE spam_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  pattern_type VARCHAR(50), -- 'regex', 'keyword', 'url'
  severity VARCHAR(20), -- 'low', 'medium', 'high'
  action VARCHAR(50), -- 'warn', 'block', 'shadowban'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- user_restrictions table
CREATE TABLE user_restrictions (
  user_id UUID REFERENCES users(id),
  restriction_type VARCHAR(50), -- 'rate_limit', 'spam', 'ban'
  reason TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, restriction_type)
);
```

### スパム検出アルゴリズム
1. パターンマッチング
   - 既知のスパムパターン
   - URL短縮サービスの検出
   - 繰り返しパターン

2. 行動分析
   - 急激なメッセージ送信
   - 同一内容の繰り返し
   - 大量のメンション/リンク

3. 機械学習（将来的）
   - スパム分類モデル
   - 異常検知

### 対策アクション
1. 警告
   - ユーザーへの通知
   - 一時的な制限

2. 制限
   - メッセージ送信間隔の延長
   - 機能の一部制限

3. ブロック
   - アカウント一時停止
   - IP制限
   - シャドウバン

## 実装アプローチ

### Phase 1: 基本的なレート制限
1. Redisベースのレート制限実装
2. 主要エンドポイントへの適用
3. エラーレスポンスの実装

### Phase 2: スパム検出
1. 基本的なパターンマッチング
2. 重複メッセージ検出
3. 違反ログ記録

### Phase 3: 高度な保護
1. 動的レート制限
2. ユーザー評価システム
3. 管理者ダッシュボード

### Phase 4: 自動化と最適化
1. 自動スパム検出
2. 機械学習統合
3. レート制限の自動調整

## 受け入れ基準
- [ ] APIエンドポイントにレート制限が適用される
- [ ] レート制限超過時に適切なエラーが返される
- [ ] スパムメッセージが検出・ブロックされる
- [ ] 違反履歴が記録される
- [ ] 管理者が制限を設定・調整できる
- [ ] 正当なユーザーの使用を妨げない
- [ ] レート制限情報がレスポンスヘッダーに含まれる

## 注意事項
- 正当なユーザーへの影響最小化
- 分散環境での一貫性
- DDoS攻撃への対応
- プライバシーとログ保持
- 誤検知への対処方法

## 関連Issue
- #5 ファイルアップロード（アップロード制限）
- #6 認証システム（ユーザー識別）
- #9 通知システム（スパム通知の防止）