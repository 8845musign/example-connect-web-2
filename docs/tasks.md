# Connect RPCチャットアプリケーション 実装タスクリスト

## 概要

Connect RPCを使用したリアルタイムチャットアプリケーションの実装タスクを管理します。
各タスクには依存関係と推定時間を記載しています。

## タスク一覧

### フェーズ1: プロジェクト初期化 (推定: 45分)

#### 1.1 ルートプロジェクトのセットアップ
- [ ] プロジェクトルートディレクトリの作成
- [ ] `.gitignore`ファイルの作成
- [ ] READMEの作成
- [ ] `scripts/`ディレクトリの作成

#### 1.2 開発ツールのインストール
- [ ] Buf CLIのインストール (`npm install -g @bufbuild/buf`)
- [ ] `@bufbuild/protoc-gen-es`のインストール
- [ ] 開発効率化ツールのインストール
  - nodemon (自動リロード)
  - concurrently (複数プロセス管理)

#### 1.3 Buf設定
- [ ] `buf.yaml`の作成（プロトコル定義の管理）
- [ ] `buf.gen.yaml`の作成（コード生成設定）
- [ ] `proto/`ディレクトリ構造の作成
  - `proto/chat/v1/`ディレクトリ

#### 1.4 Protocol Buffers定義
- [ ] `proto/chat/v1/chat.proto`の作成
- [ ] サービス定義（双方向ストリーミングRPC）
- [ ] メッセージ型の定義
- [ ] `buf lint`でリント実行

### フェーズ2: バックエンド実装 (推定: 2時間)

#### 2.1 プロジェクト初期化
- [ ] `backend/`ディレクトリの作成
- [ ] `package.json`の初期化
- [ ] TypeScript設定（`tsconfig.json`）
- [ ] ESLint設定（`.eslintrc.json`）
- [ ] Prettier設定（`.prettierrc`）
- [ ] 必要な依存関係のインストール
  - @connectrpc/connect (v2.0.0+)
  - @connectrpc/connect-node (v2.0.0+)  
  - @bufbuild/protobuf (v2.2.0+)
  - typescript
  - tsx
  - @types/node
  - eslint
  - prettier

#### 2.2 コード生成
- [ ] `generate.sh`スクリプトの作成
- [ ] Bufを使用してTypeScriptコードを生成
- [ ] 生成されたコードの確認
- [ ] 生成されたコードの型チェック

#### 2.3 サーバー実装
- [ ] `src/server.ts`の作成（HTTPサーバーのセットアップ）
- [ ] Connect RPCルーターの設定（v2 API）
- [ ] CORS設定の実装
- [ ] ポート8080でのリッスン

#### 2.4 チャットサービス実装
- [ ] `src/services/chat.ts`の作成
- [ ] ChatManagerクラスの実装
- [ ] 双方向ストリーミングハンドラーの実装（ReadableStream使用）
- [ ] ユーザー管理ロジック
  - 入室処理
  - メッセージブロードキャスト
  - 退室処理
- [ ] エラーハンドリング（ConnectError使用）

#### 2.5 開発用スクリプト
- [ ] `npm run dev`コマンドの設定（nodemon使用）
- [ ] `npm run build`コマンドの設定
- [ ] `npm run lint`コマンドの設定
- [ ] `npm run format`コマンドの設定

### フェーズ3: フロントエンド実装 (推定: 3.5時間)

#### 3.1 プロジェクト初期化
- [ ] `frontend/`ディレクトリの作成
- [ ] React Router v7プロジェクトの作成
  ```bash
  npm create vite@latest frontend -- --template react-ts
  cd frontend
  ```
- [ ] React Router v7の設定
  - `@react-router/dev`のインストール
  - `vite.config.ts`の更新（React Routerプラグイン）
  - `react-router.config.ts`の作成（SPAモード設定）
- [ ] ESLint設定（React用）
- [ ] Prettier設定
- [ ] 必要な依存関係のインストール
  - react-router@latest
  - @react-router/dev
  - @connectrpc/connect (v2.0.0+)
  - @connectrpc/connect-web (v2.0.0+)
  - @bufbuild/protobuf (v2.2.0+)
  - @types/react
  - @types/react-dom

#### 3.2 React Router構造のセットアップ
- [ ] `src/entry.client.tsx`の作成
- [ ] `src/root.tsx`の作成
- [ ] `src/routes.ts`の作成
- [ ] `tsconfig.json`の更新（React Router型サポート）
- [ ] `.gitignore`に`.react-router/`を追加

#### 3.3 コード生成
- [ ] Bufを使用してTypeScriptコードを生成
- [ ] 生成されたコードの確認
- [ ] 生成されたコードの型チェック

#### 3.4 ルートコンポーネントの実装
- [ ] `src/routes/index.tsx`の作成（ログイン画面）
  - clientActionでのフォーム処理
  - セッションストレージへのユーザー名保存
  - チャット画面へのリダイレクト
- [ ] `src/routes/chat/layout.tsx`の作成
  - clientLoaderでの認証チェック
  - チャットレイアウト
  - ログアウト機能
- [ ] `src/routes/chat/room.tsx`の作成
  - チャットルームの実装
  - useChatフックの使用

#### 3.5 サービス層の実装
- [ ] `src/services/chat.service.ts`の作成
  - ChatClientクラスの実装
  - Connect RPCクライアントの設定
  - ストリーミング接続管理
  - シングルトンパターン

#### 3.6 カスタムフックの実装
- [ ] `src/hooks/useChat.ts`の作成
  - チャット接続管理
  - イベントハンドリング
  - 状態管理
- [ ] `src/hooks/useReconnect.ts`の実装
  - 自動再接続ロジック
  - エクスポネンシャルバックオフ

#### 3.7 UIコンポーネントの実装
- [ ] `src/components/MessageList.tsx`の実装
  - メッセージの表示
  - 自分/他人のメッセージの区別
  - タイムスタンプ表示
  - 自動スクロール
- [ ] `src/components/UserList.tsx`の実装
  - アクティブユーザーの表示
  - オンライン状態表示
  - ユーザー数カウント
- [ ] `src/components/MessageInput.tsx`の実装
  - テキスト入力フィールド
  - 送信ボタン
  - Enterキーでの送信
  - 送信中の状態表示

#### 3.8 スタイリング
- [ ] `src/styles/app.css`の作成
- [ ] レスポンシブデザインの実装
- [ ] ダークモード対応（オプション）

### フェーズ4: 統合とテスト (推定: 1.5時間)

#### 4.1 開発スクリプトの作成
- [ ] `scripts/dev.sh`の作成（フロントエンド・バックエンド同時起動）
  ```bash
  #!/bin/bash
  npx concurrently \
    "npm --prefix backend run dev" \
    "npm --prefix frontend run dev"
  ```
- [ ] `scripts/generate.sh`の作成（コード生成自動化）
  ```bash
  #!/bin/bash
  buf generate
  ```
- [ ] スクリプトの実行権限設定
- [ ] ルートの`package.json`にスクリプト追加
  - `npm run dev`: 全体の開発サーバー起動
  - `npm run generate`: コード生成

#### 4.2 統合作業
- [ ] バックエンドとフロントエンドの接続確認
- [ ] CORS設定の動作確認
- [ ] Connect RPCエンドポイントのプロキシ設定（Vite）
- [ ] エラーケースの確認

#### 4.3 機能テスト
- [ ] ユーザー入室のテスト
- [ ] メッセージ送受信のテスト
- [ ] 複数ユーザーでのテスト（別ブラウザ/タブ）
- [ ] ユーザー退室のテスト
- [ ] 再接続のテスト

#### 4.4 エラーハンドリングテスト
- [ ] ネットワークエラー時の動作
- [ ] サーバー停止時の動作
- [ ] 不正な入力の処理
- [ ] ユーザー名重複時の処理

#### 4.5 パフォーマンステスト
- [ ] 大量メッセージの送信テスト
- [ ] 多数ユーザー接続時の動作確認
- [ ] メモリリークの確認

### フェーズ5: 仕上げ (推定: 45分)

#### 5.1 ドキュメント整備
- [ ] READMEの完成
  - プロジェクト概要
  - 必要な環境
  - セットアップ手順
  - 実行方法
  - アーキテクチャ説明
  - トラブルシューティング
- [ ] API仕様書の作成
- [ ] コードコメントの追加

#### 5.2 開発環境整備
- [ ] 環境変数の設定（`.env.example`）
- [ ] ルートの`package.json`作成
  ```json
  {
    "name": "connect-web-chat",
    "scripts": {
      "dev": "./scripts/dev.sh",
      "generate": "./scripts/generate.sh",
      "install:all": "npm install && npm --prefix backend install && npm --prefix frontend install"
    },
    "devDependencies": {
      "concurrently": "^8.2.0"
    }
  }
  ```

#### 5.3 品質向上
- [ ] ESLintでのコードチェック
- [ ] Prettierでのコード整形
- [ ] TypeScriptの厳密モード確認
- [ ] 未使用コードの削除

## 実行順序と依存関係

```
フェーズ1 → フェーズ2 → フェーズ3 → フェーズ4 → フェーズ5
           ↘                    ↙
              並行実行可能
```

- フェーズ1は必須の前提条件
- フェーズ2とフェーズ3は、フェーズ1完了後に並行実行可能
- フェーズ4は、フェーズ2とフェーズ3の両方が完了後に実行
- フェーズ5は最終段階

## 推定総時間

- フェーズ1: 45分
- フェーズ2: 2時間
- フェーズ3: 3.5時間
- フェーズ4: 1.5時間
- フェーズ5: 45分

**合計: 約8.5時間**

## 注意事項

1. **コード生成**: Protocol Buffersの変更時は必ずコード再生成を実行
2. **型安全性**: TypeScriptの型チェックを活用し、型安全性を保証
3. **エラーハンドリング**: ユーザー体験を考慮した適切なエラー処理
4. **パフォーマンス**: 大量のメッセージに対応できる効率的な実装

## 追加検討事項（将来の拡張）

- メッセージの永続化（データベース連携）
- ユーザー認証機能
- 複数ルーム対応
- メッセージの検索機能
- ファイル送信機能
- 通知機能
- モバイル対応